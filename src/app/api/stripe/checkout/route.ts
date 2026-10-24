import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PLANS, isPlanKey, priceIdForPlan } from '@/lib/tiers';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    });
  }
  return _stripe;
}

// Checkout branding, so buyers see TrainField instead of the Stripe account name.
// Colors are the site's --dark and --amber (src/app/globals.css); the icon is the
// header LogoMark (src/components/site/Logo.tsx) rendered to public/trainfield-icon.png.
// The icon always points at production so Stripe can fetch it from any deployment.
type BrandingSettings = NonNullable<Parameters<Stripe['checkout']['sessions']['create']>[0]>['branding_settings'];
const CHECKOUT_BRANDING: BrandingSettings = {
  display_name: 'TrainField AI',
  background_color: '#1A1208',
  button_color: '#D4860A',
  border_style: 'rounded',
  icon: { type: 'url', url: 'https://training.goodbotai.tech/trainfield-icon.png' },
};

export async function POST(req: NextRequest) {
  try {
    // The pricing page sends a plan key ("solo" | "small" | "team") as `priceId`.
    const body = await req.json();
    const plan = body.plan ?? body.priceId;
    const { successUrl, cancelUrl, email } = body;

    if (!isPlanKey(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const tier = PLANS[plan].tier;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://training.goodbotai.tech';

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIdForPlan(plan),
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: successUrl || `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: cancelUrl || `${baseUrl}/pricing`,
      // The webhook reads the tier from here (see tierFromCheckoutMetadata).
      metadata: { plan, tier },
      subscription_data: { metadata: { plan, tier } },
      branding_settings: CHECKOUT_BRANDING,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error('Checkout session error:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Checkout is not available right now.' }, { status: 500 });
  }
}
