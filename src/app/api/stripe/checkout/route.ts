import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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

const PRICE_IDS: Record<string, string | null> = {
  'solo-monthly':   process.env.STRIPE_SOLO_MONTHLY_PRICE_ID   || null,
  'solo-annual':    process.env.STRIPE_SOLO_ANNUAL_PRICE_ID    || null,
  'team-monthly':   process.env.STRIPE_TEAM_MONTHLY_PRICE_ID  || null,
  'team-annual':    process.env.STRIPE_TEAM_ANNUAL_PRICE_ID    || null,
  'small-monthly':  process.env.STRIPE_SMALL_MONTHLY_PRICE_ID  || null,
  'small-annual':   process.env.STRIPE_SMALL_ANNUAL_PRICE_ID   || null,
};

export async function POST(req: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl, email } = await req.json();

    if (!priceId || !PRICE_IDS[priceId]) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://training.goodbotai.tech';

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[priceId]!,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: successUrl || `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: cancelUrl || `${baseUrl}/pricing`,
      metadata: {
        priceId,
        ...(email ? { customer_email: email } : {}),
      },
      subscription_data: {
        metadata: { priceId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
