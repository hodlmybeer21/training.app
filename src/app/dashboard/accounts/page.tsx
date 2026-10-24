'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardNav from '@/components/DashboardNav';
import { PERSONA_BY_CATEGORY } from '@/lib/personas/index';
import { CATEGORIES } from '@/lib/categories';

type RecentSession = { id: string; overall_score: number | null; created_at: string; scenario_name: string | null };
type Account = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  persona_id: string;
  notes: string | null;
  updated_at: string;
  practice_count: number;
  recent_sessions: RecentSession[];
};
type PersonaOption = { id: string; name: string; emoji: string; group: string };
type FormState = { name: string; address: string; city: string; persona_id: string; notes: string };

const NOTES_MAX = 1000;
const DEFAULT_PERSONA = 'nh-liquor-store-owner';
const emptyForm = (): FormState => ({ name: '', address: '', city: '', persona_id: DEFAULT_PERSONA, notes: '' });

// Built-in personas grouped by vertical, beer distribution (store owners) first.
const BUILT_IN: PersonaOption[] = (() => {
  const seen = new Set<string>();
  const out: PersonaOption[] = [];
  const order = ['beer-distribution', ...Object.keys(PERSONA_BY_CATEGORY).filter(c => c !== 'beer-distribution')];
  for (const cat of order) {
    const group = CATEGORIES.find(c => c.id === cat)?.name || cat;
    for (const p of PERSONA_BY_CATEGORY[cat] || []) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({ id: p.id, name: p.name, emoji: p.emoji, group });
    }
  }
  return out;
})();

function scoreColor(score: number | null) {
  if (score === null) return '#6b7280';
  return score >= 75 ? '#15803d' : score >= 60 ? '#b45309' : '#dc2626';
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [teamPersonas, setTeamPersonas] = useState<PersonaOption[]>([]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const fetchAccounts = () =>
    fetch('/api/accounts')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { setAccounts(d.accounts || []); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  const load = () => { setLoading(true); setLoadError(false); fetchAccounts(); };

  useEffect(() => {
    fetchAccounts();
    fetch('/api/personas')
      .then(r => (r.ok ? r.json() : { personas: [] }))
      .then(d => {
        if (Array.isArray(d.personas)) {
          setTeamPersonas(d.personas.filter((p: { active: boolean }) => p.active).map((p: { id: string; name: string; emoji: string }) => ({ id: p.id, name: p.name, emoji: p.emoji || '🎯', group: 'Your team' })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) nameRef.current?.focus();
  }, [editing]);

  const allPersonas = useMemo(() => [...teamPersonas, ...BUILT_IN], [teamPersonas]);
  const personaById = (id: string) => allPersonas.find(p => p.id === id);
  const groups = useMemo(() => {
    const m = new Map<string, PersonaOption[]>();
    for (const p of allPersonas) m.set(p.group, [...(m.get(p.group) || []), p]);
    return [...m.entries()];
  }, [allPersonas]);

  const startNew = () => { setForm(emptyForm()); setFormError(''); setSavedMsg(''); setEditing('new'); };
  const startEdit = (a: Account) => {
    setForm({ name: a.name, address: a.address || '', city: a.city || '', persona_id: a.persona_id, notes: a.notes || '' });
    setFormError('');
    setSavedMsg('');
    setEditing(a.id);
  };
  const cancel = () => { setEditing(null); setFormError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Store or account name is required.'); return; }
    setSaving(true);
    setFormError('');
    const isNew = editing === 'new';
    try {
      const res = await fetch(isNew ? '/api/accounts' : `/api/accounts/${editing}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not save the account.');
      if (isNew) setAccounts(prev => [d.account, ...prev]);
      else setAccounts(prev => prev.map(a => (a.id === editing ? { ...a, ...d.account } : a)));
      setSavedMsg(isNew ? `Added ${d.account.name}.` : `Saved ${d.account.name}.`);
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the account.');
    } finally {
      setSaving(false);
    }
  };

  const formPanel = (
    <form onSubmit={submit} aria-labelledby="account-form-title" style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1.5px solid #D4860A', boxShadow: '0 2px 8px rgba(212,134,10,0.12)' }}>
      <h2 id="account-form-title" style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{editing === 'new' ? 'Add an account' : 'Edit account'}</h2>
      <div className="accounts-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="acct-name" style={labelStyle}>Store or account name *</label>
          <input id="acct-name" ref={nameRef} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={120} placeholder="e.g. Main Street Market" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="acct-address" style={labelStyle}>Address (optional)</label>
          <input id="acct-address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} maxLength={200} placeholder="12 Main St" autoComplete="off" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="acct-city" style={labelStyle}>City or town (optional)</label>
          <input id="acct-city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} maxLength={80} placeholder="Concord" autoComplete="off" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="acct-persona" style={labelStyle}>Store-owner persona *</label>
          <select id="acct-persona" value={form.persona_id} onChange={e => setForm(f => ({ ...f, persona_id: e.target.value }))} aria-describedby="acct-persona-help" style={inputStyle}>
            {!personaById(form.persona_id) && <option value={form.persona_id}>Persona no longer available — pick another</option>}
            {groups.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </optgroup>
            ))}
          </select>
          <p id="acct-persona-help" style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Pick the practice persona that plays most like this owner. It&apos;s an AI character, not the real person.</p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="acct-notes" style={labelStyle}>Your notes (optional)</label>
          <p id="acct-notes-warning" role="note" style={{ fontSize: 12, color: '#92400e', background: '#fff7e6', border: '1px solid rgba(212,134,10,0.35)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
            <span aria-hidden="true">⚠️ </span>Don&apos;t record or paste conversations; notes only.
          </p>
          <textarea id="acct-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value.slice(0, NOTES_MAX) }))} maxLength={NOTES_MAX} rows={4} aria-describedby="acct-notes-warning acct-notes-count" placeholder="e.g. Owner decides on Tuesdays. Wants a tasting before adding SKUs." style={{ ...inputStyle, resize: 'vertical' }} />
          <div id="acct-notes-count" style={{ fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 4 }}>{form.notes.length}/{NOTES_MAX}</div>
        </div>
      </div>
      {formError && <p role="alert" style={{ fontSize: 13, color: '#b91c1c', marginTop: 8 }}>{formError}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button type="submit" disabled={saving} style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Saving…' : editing === 'new' ? 'Add account' : 'Save changes'}
        </button>
        <button type="button" onClick={cancel} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .accounts-body { padding: 16px !important; }
          .accounts-form-grid { grid-template-columns: 1fr !important; }
          .accounts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ flex: 1, minWidth: 0 }} className="main-content">
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <DashboardNav active="accounts" />
          <h1 className="dash-page-title" style={{ fontSize: 20, flex: 1 }}><span aria-hidden="true">🏪 </span>Accounts</h1>
          {editing === null && !loading && !loadError && (
            <button type="button" onClick={startNew} style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add account</button>
          )}
        </header>

        <div className="accounts-body" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
          <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, maxWidth: 720 }}>
            Keep the stores you call on, give each one the practice persona that plays most like its owner, and rehearse before the visit. Scores from those runs show on the account.
          </p>
          {savedMsg && <div role="status" style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>{savedMsg}</div>}

          {editing === 'new' && formPanel}

          {loading ? (
            <div role="status" className="dash-state">Loading accounts…</div>
          ) : loadError ? (
            <div role="alert" className="dash-state dash-state-error">
              We couldn&apos;t load your accounts.{' '}
              <button type="button" className="dash-retry" onClick={load}>Try again</button>
            </div>
          ) : accounts.length === 0 && editing !== 'new' ? (
            <div className="dash-state">
              No accounts yet. Add the stores you call on and pick a store-owner persona for each, so you can practice the conversation before you walk in.<br />
              <button type="button" className="dash-retry" onClick={startNew} style={{ marginTop: 12 }}>+ Add your first account</button>
            </div>
          ) : (
            <ul className="accounts-grid" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 16 }}>
              {accounts.map(a => {
                if (editing === a.id) return <li key={a.id} style={{ gridColumn: '1 / -1' }}>{formPanel}</li>;
                const persona = personaById(a.persona_id);
                const where = [a.address, a.city].filter(Boolean).join(', ');
                return (
                  <li key={a.id} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', overflowWrap: 'anywhere' }}>{a.name}</h2>
                      {where && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflowWrap: 'anywhere' }}>{where}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                      <span aria-hidden="true" style={{ fontSize: 18 }}>{persona?.emoji || '❔'}</span>
                      <span><span className="sr-only">Persona: </span>{persona ? persona.name : 'Persona no longer available. Edit to pick another.'}</span>
                    </div>
                    {a.notes && <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>{a.notes}</p>}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
                        Practice scores{a.practice_count ? ` · ${a.practice_count} run${a.practice_count === 1 ? '' : 's'}` : ''}
                      </div>
                      {a.recent_sessions.length ? (
                        <ul aria-label={`Recent practice scores for ${a.name}`} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {a.recent_sessions.map(s => (
                            <li key={s.id} title={s.scenario_name || undefined} style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 999, padding: '3px 10px', color: '#374151' }}>
                              <strong style={{ color: scoreColor(s.overall_score) }}>{s.overall_score ?? '--'}</strong>{' '}
                              <span style={{ color: '#6b7280' }}>{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: 12, color: '#6b7280' }}>No practice runs yet.</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                      <a href={`/dashboard/practice?persona=${encodeURIComponent(a.persona_id)}&account=${a.id}`} aria-label={`Practice against the owner of ${a.name}`} style={{ background: '#D4860A', color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <span aria-hidden="true">🎤 </span>Practice against this owner
                      </a>
                      <button type="button" onClick={() => startEdit(a)} aria-label={`Edit ${a.name}`} disabled={editing !== null} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: editing !== null ? 'not-allowed' : 'pointer' }}>
                        Edit
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
