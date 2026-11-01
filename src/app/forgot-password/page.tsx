'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || 'Something went wrong. Try again.');
      else setSent(d.message || 'If that email has a TrainField account, a reset link is on its way.');
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <div className="auth-card">
          <h1>Reset your password</h1>
          {sent ? (
            <>
              <p className="sub" role="status">{sent} Check your inbox (and spam folder). The link works once.</p>
              <div className="auth-alt"><Link href="/login">Back to sign in</Link></div>
            </>
          ) : (
            <>
              <p className="sub">Enter the email you sign in with and we&apos;ll send you a link to choose a new password.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
                </div>
                {error && <div className="err" role="alert">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <div className="auth-alt">Remembered it? <Link href="/login">Sign in</Link>.</div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
