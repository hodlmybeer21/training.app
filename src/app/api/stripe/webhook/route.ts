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
      try {
        await handleCheckoutCompleted(session);
      } catch(e: any) {
        console.error('handleCheckoutCompleted threw:', e.message, e.stack);
      }
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

// Builds the link that lets a new customer set their own password.
// It points at our /set-password page with Supabase's one-time token hash, so it
// does not depend on Supabase's redirect URL allow-list. No password is ever created here.
function buildSetPasswordLink(hashedToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://training.goodbotai.tech';
  return `${baseUrl}/set-password?token_hash=${encodeURIComponent(hashedToken)}&type=invite`;
}

async function sendInviteEmail(email: string, link: string, tier: string) {
  const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
  if (!AGENTMAIL_API_KEY) {
    console.log('AgentMail not configured, skipping welcome email');
    return;
  }

  const tierLabel = TIER_DISPLAY[tier] || tier;
  const subject = `Your TrainField AI account is ready`;
  const text = `Your TrainField AI ${tierLabel} account has been created for ${email}.

Set your password here to finish signing up:
${link}

This link works once and expires soon. If it has expired, reply to this email and we'll send a new one.

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
    // Only the status is logged: the response may echo the message body (which holds the link).
    console.log(`  Invite email API response status: ${res.status}`);
  } catch (e: any) {
    console.error('Failed to send invite email:', e.message);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('=== handleCheckoutCompleted START ===');
  const email = session.customer_email || session.customer_details?.email;
  console.log('  email:', email);
  const priceId = session.metadata?.priceId || (session.line_items?.data[0] as any)?.price?.id;
  console.log('  priceId from metadata:', session.metadata?.priceId);
  console.log('  priceId from line_items:', (session.line_items?.data[0] as any)?.price?.id);
  console.log('  FINAL priceId:', priceId);

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
  console.log('  TIER_ROLE_MAP keys:', Object.keys(TIER_ROLE_MAP));
  console.log('  tier from map:', tier);
  if (!tier) {
    console.error('Unknown priceId:', priceId, 'session:', session.id);
    console.log('=== END (unknown tier) ===');
    return;
  }

  const supabase = getSupabaseAdmin();
  console.log('  supabase client created');

  console.log('  Calling listUsers...');
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
  console.log('  listUsers error:', listError);
  console.log('  Total users:', allUsers?.users?.length || 0);
  const existingUser = allUsers?.users.find(u => u.email === email);
  console.log('  existingUser:', !!existingUser, existingUser?.id || '');

  if (existingUser) {
    console.log('User exists - updating profile only');
    // app_metadata can only be written with the service role, so it is the trusted
    // record of the paid plan (used for team seat limits).
    const { error: metaError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { ...(existingUser.app_metadata || {}), tier },
    });
    console.log('  appMetadataError:', metaError?.message || null);
    const { error: profileUpsertError } = await supabase.from('profiles').upsert({ id: existingUser.id, role: tier });
    console.log('  profileUpsertError:', profileUpsertError);
    console.log('=== END (existing user) ===');
    return;
  }

  // Create the user through Supabase's invite flow. No password is generated:
  // the customer sets their own from the emailed link.
  console.log('Creating invited user...');
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { tier } },
  });
  if (linkError || !linkData?.user || !linkData.properties?.hashed_token) {
    console.error('Invite creation error:', linkError?.message || 'missing user or token');
    console.log('=== END (invite error) ===');
    return;
  }

  const userId = linkData.user.id;
  console.log('  userId:', userId);

  const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...(linkData.user.app_metadata || {}), tier },
  });
  console.log('  appMetadataError:', metaError?.message || null);

  const { error: profileInsertError } = await supabase.from('profiles').insert({ id: userId, role: tier });
  console.log('  profileInsertError:', profileInsertError);

  await sendInviteEmail(email, buildSetPasswordLink(linkData.properties.hashed_token), tier);

  console.log(`✅ Created account (tier: ${TIER_DISPLAY[tier]}) — set-password link emailed`);
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
