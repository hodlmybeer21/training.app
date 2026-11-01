import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PLANS, TIER_DISPLAY, isPlanKey, priceIdForPlan, seatSummary } from '@/lib/tiers';
import { safeRedirectUrl } from '@/lib/server/redirects';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      // fetch works on Node and on Cloudflare Workers (the Node http client hangs on Workers).
      httpClient: Stripe.createFetchHttpClient?.(),
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
    const { email } = body;

    if (!isPlanKey(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const tier = PLANS[plan].tier;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://training.goodbotai.tech';
    // Stripe sends the buyer back to these URLs, so only our own origins are allowed.
    // Anything else (another site, javascript:, a malformed URL) falls back to the default.
    const allowed = [req.nextUrl.origin, baseUrl];
    const successUrl = safeRedirectUrl(body.successUrl, allowed, `${baseUrl}/welcome?checkout=success`);
    const cancelUrl = safeRedirectUrl(body.cancelUrl, allowed, `${baseUrl}/pricing`);

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIdForPlan(plan),
          quantity: 1,
        },
      ],
      customer_email: typeof email === 'string' && email ? email : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // The webhook reads the tier from here (see tierFromCheckoutMetadata).
      metadata: { plan, tier },
      subscription_data: { metadata: { plan, tier } },
      branding_settings: CHECKOUT_BRANDING,
      // Same seat wording as the pricing page (seats include the manager).
      custom_text: { submit: { message: `${TIER_DISPLAY[tier]}: ${seatSummary(tier)}.${typeof email === 'string' && email ? '' : ' New to TrainField? After payment we email you a link to set your password.'}` } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error('Checkout session error:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Checkout is not available right now.' }, { status: 500 });
  }
}
