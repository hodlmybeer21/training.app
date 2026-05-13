import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.AGENTMAIL_API_KEY;
  return NextResponse.json({
    hasKey: !!key,
    keyLength: key ? key.length : 0,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
