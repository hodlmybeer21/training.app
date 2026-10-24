'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

type Stage = 'verifying' | 'ready' | 'invalid' | 'saving' | 'done';

function SetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const started = useRef(false);
  const [stage, setStage] = useState<Stage>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    (async () => {
      if (tokenHash && (type === 'invite' || type === 'recovery')) {
        // Exchange the one-time link for a session. The token can only be used once.
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (verifyError) { setStage('invalid'); return; }
        window.history.replaceState(null, '', '/set-password');
        setStage('ready');
        return;
      }
      const { data } = await supabase.auth.getUser();
      setStage(data.user ? 'ready' : 'invalid');
    })();
  }, [params, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setStage('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || 'Could not save your password. Try again.');
      setStage('ready');
      return;
    }
    setStage('done');
    router.replace('/dashboard');
  }

  return (
    <div className="auth-card">
      <h1>Set your password</h1>
      {stage === 'verifying' && <p className="sub" role="status">Checking your link…</p>}
      {stage === 'invalid' && (
        <>
          <p className="sub" role="alert">
            This link has expired or was already used. Reply to your welcome email and we&apos;ll send a new one.
          </p>
          <div className="auth-alt">
            Already set a password? <a href="/login">Sign in</a>.
          </div>
        </>
      )}
      {(stage === 'ready' || stage === 'saving') && (
        <>
          <p className="sub">Choose a password for your TrainField AI account. Use at least 8 characters.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </div>
            {error && <div className="err" role="alert">{error}</div>}
            <button type="submit" disabled={stage === 'saving'} className="btn-primary" style={{ width: '100%', padding: 14, opacity: stage === 'saving' ? 0.6 : 1, cursor: stage === 'saving' ? 'not-allowed' : 'pointer' }}>
              {stage === 'saving' ? 'Saving…' : 'Save password'}
            </button>
          </form>
        </>
      )}
      {stage === 'done' && <p className="sub" role="status">Password saved. Taking you to your dashboard…</p>}
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <Suspense fallback={<div className="auth-card"><h1>Set your password</h1><p className="sub" role="status">Loading…</p></div>}>
          <SetPasswordForm />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
