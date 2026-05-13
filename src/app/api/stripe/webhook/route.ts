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
    console.log('Webhook raw body:', body.substring(0, 100));
    console.log('Has sig:', !!sig, 'Has whsec:', !!whsec, 'whsec value:', whsec ? 'SET' : 'NOT SET');
    event = getStripe().webhooks.constructEvent(body, sig, whsec!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  let webhookEmail = '';
  try {
    if (event.type === 'checkout.session.completed') {
      console.log('Processing checkout.session.completed event');
      const session = event.data.object as Stripe.Checkout.Session;
      webhookEmail = session.customer_email || session.customer_details?.email || '';
      console.log('Session ID:', session.id, '| Email:', webhookEmail);
      const startTime = Date.now();
      await handleCheckoutCompleted(session);
      console.log('handleCheckoutCompleted took', Date.now() - startTime, 'ms');
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
    }

    const response = { received: true, timestamp: Date.now(), version: 'v8', email: webhookEmail };
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    console.error('Stack:', err.stack);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendCredentialsEmail(email: string, password: string, tier: string) {
  const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
  console.log(`📧 Attempting to send credentials email to ${email}`);
  console.log(`  AgentMail configured:`, !!AGENTMAIL_API_KEY);

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
    const res = await fetch(`https://api.agentmail.to/v0/inboxes/goodbot@agentmail.to/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [email],
        subject,
        text,
        from: 'goodbot@agentmail.to',
      }),
    });
    console.log(`  Email API response status: ${res.status}`);
    const data = await res.json();
    console.log(`  Email API response:`, JSON.stringify(data).substring(0, 200));
    if (data.id || data.message_id) {
      console.log(`📧 Welcome email sent to ${email}`);
    } else {
      console.log('AgentMail response:', data);
    }
  } catch (e: any) {
    console.error('Failed to send welcome email:', e.message);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('=== handleCheckoutCompleted START ===');
  const email = session.customer_email || session.customer_details?.email;
  console.log('  email:', email);
  const priceId = session.metadata?.priceId || (session.line_items?.data[0] as any)?.price?.id;
  console.log('  priceId:', priceId);

  if (!email) {
    console.error('No email in checkout session:', session.id);
    console.log('=== END (no email) ===');
    return;
  }
  if (!priceId) {
    console.error('No priceId in checkout session metadata:', session.id);
    console.log('=== END (no priceId) ===');
    return;
  }

  const tier = TIER_ROLE_MAP[priceId as string];
  console.log('  tier from map:', tier);
  if (!tier) {
    console.error('Unknown priceId:', priceId, 'session:', session.id);
    console.log('=== END (unknown tier) ===');
    return;
  }

  const supabase = getSupabaseAdmin();
  console.log('  supabase client created');
  const tempPassword = generateSecurePassword();
  console.log('  tempPassword generated');

  console.log('  Calling listUsers...');
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
  console.log('  listUsers error:', listError);
  console.log('  Total users:', allUsers?.users?.length || 0);
  const existingUser = allUsers?.users.find(u => u.email === email);
  console.log('  existingUser:', !!existingUser, existingUser?.id || '');

  if (existingUser) {
    console.log('User exists - updating profile only');
    const { error: profileUpsertError } = await supabase.from('profiles').upsert({ id: existingUser.id, role: tier });
    console.log('  profileUpsertError:', profileUpsertError);
    console.log('=== END (existing user) ===');
    return;
  }

  console.log('Creating new user...');
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { tier },
  });
  console.log('  authError:', authError);
  console.log('  authUser:', authUser?.user?.id);

  if (authError) {
    console.error('Auth user creation error:', authError);
    console.log('=== END (auth error) ===');
    return;
  }

  const userId = authUser.user!.id;
  console.log('  userId:', userId);

  const { error: profileInsertError } = await supabase.from('profiles').insert({ id: userId, role: tier });
  console.log('  profileInsertError:', profileInsertError);

  console.log('Sending credentials email to:', email);
  await sendCredentialsEmail(email, tempPassword, tier);

  console.log(`✅ Created account for ${email} (tier: ${TIER_DISPLAY[tier]}) — credentials emailed`);
  console.log('=== END (success) ===');
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