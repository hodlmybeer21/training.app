import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

const TIER_ROLE_MAP: Record<string, string> = {
  'price_1TWQx5ItqtvZaj2wNbzj7QTH': 'solo',
  'price_1TWQyBItqtvZaj2wHA2n7Dvm': 'small-team',
  'price_1TWQzEItqtvZaj2wHyT8EdHY': 'team',
};

const TIER_DISPLAY: Record<string, string> = {
  solo: 'Solo',
  'small-team': 'Small Team',
  team: 'Team',
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whsec) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendCredentialsEmail(email: string, password: string, tier: string) {
  const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
  if (!AGENTMAIL_API_KEY) {
    console.log('AgentMail not configured, skipping welcome email');
    return;
  }

  const tierLabel = TIER_DISPLAY[tier] || tier;
  const subject = `Your TrainField AI account is ready`;
  const text = `Your TrainField AI ${tierLabel} account has been created.

Email: ${email}
Password: ${password}

Log in at https://training.goodbotai.tech/login

Welcome aboard!
— TrainField AI`;

  try {
    const res = await fetch('https://api.agentmail.to/v0/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [email],
        subject,
        text,
        from: 'accounts@trainfield.ai',
      }),
    });
    const data = await res.json();
    if (data.id) {
      console.log(`📧 Welcome email sent to ${email}`);
    } else {
      console.log('AgentMail response:', data);
    }
  } catch (e: any) {
    console.error('Failed to send welcome email:', e.message);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_email || session.customer_details?.email;
  const priceId = session.metadata?.priceId || session.line_items?.data[0]?.price?.id;

  if (!email) {
    console.error('No email in checkout session:', session.id);
    return;
  }
  if (!priceId) {
    console.error('No priceId in checkout session metadata:', session.id);
    return;
  }

  const tier = TIER_ROLE_MAP[priceId as string];
  if (!tier) {
    console.error('Unknown priceId:', priceId, 'session:', session.id);
    return;
  }

  const supabase = getSupabaseAdmin();
  const tempPassword = generateSecurePassword();

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { tier },
  });

  if (authError) {
    if (authError.code === 'email_address_already_in_use') {
      console.log('User already exists, updating tier:', email);
      return;
    }
    console.error('Auth user creation error:', authError);
    return;
  }

  const userId = authUser.user!.id;

  // Update profile with tier
  await supabase
    .from('profiles')
    .update({ role: tier, subscription_tier: tier })
    .eq('id', userId);

  // Send credentials email
  await sendCredentialsEmail(email, tempPassword, tier);

  console.log(`✅ Created account for ${email} (tier: ${TIER_DISPLAY[tier]}) — credentials emailed`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const priceId = (invoice.lines.data[0] as any)?.price?.id;
  if (!priceId) return;
  const tier = TIER_ROLE_MAP[priceId];
  if (!tier) return;
  console.log(`📝 Renewal for customer ${customerId}, tier: ${TIER_DISPLAY[tier]}`);
}

function generateSecurePassword(length = 20): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const array = new Uint8Array(length || 20);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}