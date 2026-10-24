'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <div className="auth-card">
          <h1>Sign in</h1>
          <p className="sub">Pick up where you left off. Your scored calls, history and team goals are waiting.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>

            {error && <div className="err" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-alt">
            <strong style={{ color: 'var(--cream)', fontWeight: 500 }}>No account yet?</strong><br />
            Accounts are created when you buy a plan, or when your manager adds you.{' '}
            <a href="/#demo">Try the free demo</a> with no account, or <a href="/pricing">see plans</a>.
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
