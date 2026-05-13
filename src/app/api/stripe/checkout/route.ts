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

const PRICE_IDS: Record<string, string> = {
  'solo':  'price_1TWQx5ItqtvZaj2wNbzj7QTH',
  'small': 'price_1TWQyBItqtvZaj2wHA2n7Dvm',
  'team':  'price_1TWQzEItqtvZaj2wHyT8EdHY',
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
