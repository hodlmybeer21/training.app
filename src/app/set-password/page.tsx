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

  const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box' as const };

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Set your password</h1>
      {stage === 'verifying' && <p>Checking your link…</p>}
      {stage === 'invalid' && (
        <p>
          This link has expired or was already used. Reply to your welcome email and we&apos;ll send a new one,
          or <a href="/login" style={{ textDecoration: 'underline' }}>sign in</a> if you already set a password.
        </p>
      )}
      {(stage === 'ready' || stage === 'saving') && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <p style={{ color: '#4b5563' }}>Choose a password for your TrainField AI account.</p>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>New password</div>
            <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} required minLength={8} />
          </label>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Confirm password</div>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={input} required minLength={8} />
          </label>
          {error && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={stage === 'saving'} style={{ padding: '12px 16px', borderRadius: 8, background: '#1A1208', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            {stage === 'saving' ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}
      {stage === 'done' && <p>Password saved. Taking you to your dashboard…</p>}
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense fallback={<div style={{ maxWidth: 420, margin: '64px auto', padding: '0 20px' }}>Loading…</div>}>
          <SetPasswordForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
