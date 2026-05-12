'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { CATEGORIES } from '@/lib/categories';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_initial: string | null;
  role: string | null;
  team_id: string | null;
  email: string;
  teams: { name: string } | null;
};

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState<'overview' | 'create-manager' | 'create-rep'>('overview');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create manager form
  const [mgrEmail, setMgrEmail] = useState('');
  const [mgrPassword, setMgrPassword] = useState('');
  const [mgrTeamName, setMgrTeamName] = useState('');
  const [mgrCategory, setMgrCategory] = useState('beer-distribution');

  // Create rep form
  const [repEmail, setRepEmail] = useState('');
  const [repPassword, setRepPassword] = useState('');
  const [repManagerId, setRepManagerId] = useState('');

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/admin', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => {
        if (d.profiles) setProfiles(d.profiles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  async function handleCreateManager(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          action: 'create-manager',
          email: mgrEmail,
          password: mgrPassword,
          teamName: mgrTeamName,
          teamCategory: mgrCategory,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: d.error }); return; }
      setMessage({ type: 'success', text: `Manager created: ${mgrEmail}` });
      setMgrEmail(''); setMgrPassword(''); setMgrTeamName('');
      refresh();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setSaving(false);
  }

  async function handleCreateRep(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          action: 'create-rep',
          email: repEmail,
          password: repPassword,
          managerId: repManagerId,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: d.error }); return; }
      setMessage({ type: 'success', text: `Rep created: ${repEmail}` });
      setRepEmail(''); setRepPassword(''); setRepManagerId('');
      refresh();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setSaving(false);
  }

  async function handleUpdateRole(profile: Profile, newRole: string) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ action: 'update-role', userId: profile.id, role: newRole }),
    });
    const d = await res.json();
    if (!res.ok) { setMessage({ type: 'error', text: d.error }); return; }
    refresh();
  }

  async function handleDeleteUser(profile: Profile) {
    if (!confirm(`Delete ${profile.display_name || profile.email}? This cannot be undone.`)) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ action: 'delete-user', userId: profile.id }),
    });
    const d = await res.json();
    if (!res.ok) { setMessage({ type: 'error', text: d.error }); return; }
    refresh();
  }

  function refresh() {
    fetch('/api/admin', { headers: { 'x-user-id': user?.id || '' } })
      .then(r => r.json())
      .then(d => { if (d.profiles) setProfiles(d.profiles); });
  }

  const managers = profiles.filter(p => p.role === 'manager' || p.role === 'admin');
  const reps = profiles.filter(p => p.role === 'rep');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        .hamburger-btn { display: block !important; }
        @media (min-width: 769px) { .hamburger-btn { display: none !important; } }
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .admin-grid { grid-template-columns: 1fr !important; }
        }
        input, textarea, select { color: #1A1208 !important; }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: 220, transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease' }}>
        <Sidebar active="admin" />
      </div>
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

      <div style={{ flex: 1, overflow: 'auto', marginLeft: 0 }} className="main-content">
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setMobileMenuOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4 }}>☰</button>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>🛡️ Admin Console</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['overview', 'create-manager', 'create-rep'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                borderColor: tab === t ? '#D4860A' : '#e5e7eb',
                background: tab === t ? '#D4860A' : '#fff',
                color: tab === t ? '#fff' : '#6b7280',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {t === 'overview' ? '👥 All Users' : t === 'create-manager' ? '+ Manager' : '+ Rep'}
              </button>
            ))}
          </div>
        </header>

        <div style={{ padding: 28 }}>
          {message && (
            <div style={{ background: message.type === 'success' ? '#d1fae5' : '#fee2e2', border: `1px solid ${message.type === 'success' ? '#065f46' : '#991b1b'}`, borderRadius: 10, padding: '12px 16px', color: message.type === 'success' ? '#065f46' : '#991b1b', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
              {message.text}
            </div>
          )}

          {/* ─── OVERVIEW ─── */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{profiles.length}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Total Users</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6' }}>{managers.length}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Managers</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#D4860A' }}>{reps.length}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Reps</div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16 }}>All Users ({profiles.length})</div>
                {loading ? <div style={{ color: '#9ca3af' }}>Loading...</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #f3f4f6' }}>
                        {['Name', 'Email / ID', 'Role', 'Team', 'Actions'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 7, background: '#D4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {p.avatar_initial || (p.display_name?.[0]) || '?'}
                              </div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{p.display_name || '—'}</div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{p.id}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <select
                              value={p.role || 'rep'}
                              onChange={e => handleUpdateRole(p, e.target.value)}
                              disabled={p.id === user?.id}
                              style={{ border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600, background: '#fff', cursor: p.id === user?.id ? 'not-allowed' : 'pointer', opacity: p.id === user?.id ? 0.5 : 1 }}
                            >
                              <option value="rep">rep</option>
                              <option value="manager">manager</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>
                            {p.teams?.name || p.team_id ? `team: ${p.team_id?.slice(0, 8)}...` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              onClick={() => handleDeleteUser(p)}
                              disabled={p.id === user?.id}
                              style={{ background: 'none', border: 'none', cursor: p.id === user?.id ? 'default' : 'pointer', color: p.id === user?.id ? '#d1d5db' : '#ef4444', fontSize: 12, fontWeight: 600, opacity: p.id === user?.id ? 0.5 : 1 }}
                            >
                              🗑 Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ─── CREATE MANAGER ─── */}
          {tab === 'create-manager' && (
            <form onSubmit={handleCreateManager} style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 520, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Create New Manager</div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={mgrEmail} onChange={e => setMgrEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="manager@company.com" />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Password</label>
                <input type="text" value={mgrPassword} onChange={e => setMgrPassword(e.target.value)} required minLength={8} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="Min 8 characters" />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Team Name</label>
                <input type="text" value={mgrTeamName} onChange={e => setMgrTeamName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="e.g. Bellavance Beverage Co." />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Category</label>
                <select value={mgrCategory} onChange={e => setMgrCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>

              <button type="submit" disabled={saving} style={{ padding: '12px 20px', background: '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating...' : 'Create Manager & Team'}
              </button>
            </form>
          )}

          {/* ─── CREATE REP ─── */}
          {tab === 'create-rep' && (
            <form onSubmit={handleCreateRep} style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 520, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Create New Rep</div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={repEmail} onChange={e => setRepEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="rep@company.com" />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Password</label>
                <input type="text" value={repPassword} onChange={e => setRepPassword(e.target.value)} required minLength={8} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="Min 8 characters" />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Assign to Manager</label>
                <select value={repManagerId} onChange={e => setRepManagerId(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                  <option value="">— Select manager —</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.display_name || m.email} ({m.role})</option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={saving} style={{ padding: '12px 20px', background: '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating...' : 'Create Rep'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
