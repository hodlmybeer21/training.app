import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { TIER_DISPLAY, tierForPriceId } from '@/lib/tiers';
import { handleCheckoutCompleted } from '@/lib/server/checkout';

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

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whsec) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whsec!);
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(getSupabaseAdmin(), getStripe(), event.data.object as Stripe.Checkout.Session);
    } else if (event.type === 'invoice.payment_succeeded') {
      handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
    }
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    // A 500 makes Stripe retry the event later.
    console.error('Webhook handler error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  type Line = { pricing?: { price_details?: { price?: string } }; price?: { id?: string } };
  const line = invoice.lines.data[0] as unknown as Line | undefined;
  const priceId = line?.pricing?.price_details?.price ?? line?.price?.id;
  const tier = tierForPriceId(priceId);
  if (!tier) return;
  console.log(`Renewal for customer ${invoice.customer as string}, tier: ${TIER_DISPLAY[tier]}`);
}
