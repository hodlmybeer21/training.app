'use client';

import { useCallback, useEffect, useState } from 'react';

type Member = { id: string; display_name: string | null; role: string | null; you: boolean };
type MembersData = {
  team: { id: string; name: string };
  seats: { used: number; limit: number; tier: string | null; available: boolean };
  members: Member[];
};

// Manager view of who is on the team, with seat count, invite and remove.
export default function MembersPanel() {
  const [data, setData] = useState<MembersData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/team/members')
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Could not load your team');
        return d as MembersData;
      })
      .then((d) => { setData(d); setLoadError(''); })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName: name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ type: 'error', text: d.error || 'Invite failed' }); return; }
      setMessage({
        type: 'success',
        text: d.emailed
          ? `Invite sent to ${email}. They'll get a link to set their password.`
          : `${email} was added, but the invite email could not be sent. Contact us to resend it.`,
      });
      setEmail(''); setName('');
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: Member) {
    if (!confirm(`Remove ${m.display_name || 'this rep'} from your team? Their login and practice history stay.`)) return;
    setMessage(null);
    const res = await fetch(`/api/team/members?id=${encodeURIComponent(m.id)}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage({ type: 'error', text: d.error || 'Could not remove' }); return; }
    load();
  }

  if (loadError) {
    return <div role="alert" style={{ background: '#fff', borderRadius: 14, padding: 24, color: '#991b1b', fontSize: 14 }}>{loadError}</div>;
  }
  if (!data) return <div style={{ color: '#6b7280', fontSize: 14 }}>Loading team…</div>;

  const full = !data.seats.available;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{data.team.name}</div>
          <div data-testid="seat-count" style={{ fontSize: 13, color: full ? '#991b1b' : '#374151', fontWeight: 600 }}>
            {data.seats.used} of {data.seats.limit} seats used
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <th style={{ padding: '6px 8px' }}>Name</th>
              <th style={{ padding: '6px 8px' }}>Role</th>
              <th style={{ padding: '6px 8px' }} />
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px' }}>{m.display_name || '—'}{m.you ? ' (you)' : ''}</td>
                <td style={{ padding: '8px', color: '#6b7280' }}>{m.role}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  {m.role === 'rep' && !m.you && (
                    <button type="button" onClick={() => remove(m)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={invite} style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Add a rep</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>They get an email with a one-time link to set their own password. Each person on the team, you included, uses one seat.</div>
        {full && (
          <div role="status" style={{ fontSize: 13, color: '#991b1b' }}>
            Your team is full. Remove someone or upgrade your plan on the Pricing page to add more reps.
          </div>
        )}
        <label htmlFor="member-email" style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</label>
        <input id="member-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={full} placeholder="rep@company.com" style={{ padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
        <label htmlFor="member-name" style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name (optional)</label>
        <input id="member-name" type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={full} maxLength={80} style={{ padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
        {message && (
          <div role={message.type === 'error' ? 'alert' : 'status'} style={{ fontSize: 13, color: message.type === 'error' ? '#991b1b' : '#15803d' }}>{message.text}</div>
        )}
        <button type="submit" disabled={busy || full} style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 8, border: 'none', background: '#D4860A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy || full ? 'not-allowed' : 'pointer', opacity: busy || full ? 0.6 : 1 }}>
          {busy ? 'Sending…' : 'Send invite'}
        </button>
      </form>
    </div>
  );
}
