'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

// Where Stripe sends a buyer after a successful checkout. Guest buyers have no
// session yet (the webhook creates the account and emails a set-password link),
// so this page explains the next step instead of bouncing them to /login.
export default function WelcomePage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setSignedIn(!!data.user)).catch(() => setSignedIn(false));
  }, []);

  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <div className="auth-card">
          <h1>Payment received. Thank you!</h1>
          {signedIn === null && <p className="sub" role="status">Checking your account…</p>}
          {signedIn === true && (
            <>
              <p className="sub" role="status">Your plan is being applied to your account. It can take a minute to show up.</p>
              <Link href="/dashboard" className="btn-primary" style={{ display: 'block', textAlign: 'center', padding: 14 }}>Go to your dashboard</Link>
            </>
          )}
          {signedIn === false && (
            <>
              <p className="sub" role="status">
                We&apos;re setting up your TrainField AI account now. Check the inbox of the email you used at checkout for a link to set your password (it can take a few minutes, so check spam too).
              </p>
              <div className="auth-alt">
                Already have a password? <Link href="/login">Sign in</Link>. Link not arriving? <Link href="/forgot-password">Send a new one</Link>.
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
