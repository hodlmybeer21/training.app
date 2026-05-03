import { useState, useEffect } from 'react';

type Goal = {
  id: string;
  goal_text: string;
  product_sku: string | null;
  goal_type: string;
  target_cases: number | null;
  target_pods: number | null;
  target_date: string | null;
  created_at: string;
};

const GOAL_TYPES = [
  { value: 'volume', label: '📦 Volume', desc: 'Case volume target' },
  { value: 'pod', label: '📍 POD', desc: 'Points of distribution' },
  { value: 'execution', label: '🧊 Execution', desc: 'Display/cold box compliance' },
  { value: 'combo', label: '🎯 Combo', desc: 'Volume + execution combined' },
];

export default function GoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    goal_text: '',
    product_sku: '',
    goal_type: 'volume',
    target_cases: '',
    target_pods: '',
    target_date: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(d => { if (d.goals) setGoals(d.goals); })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.goal_text.trim()) { setError('Goal description is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_text: form.goal_text,
          product_sku: form.product_sku || null,
          goal_type: form.goal_type,
          target_cases: form.target_cases ? parseInt(form.target_cases) : null,
          target_pods: form.target_pods ? parseInt(form.target_pods) : null,
          target_date: form.target_date || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to create goal');
      setGoals(prev => [d.goal, ...prev]);
      setForm({ goal_text: '', product_sku: '', goal_type: 'volume', target_cases: '', target_pods: '', target_date: '' });
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) setGoals(prev => prev.filter(g => g.id !== id));
    } catch {}
    setDeleting(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Active goals */}
      {goals.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Active Team Goals ({goals.length})
            </div>
            <button
              onClick={() => setShowForm(f => !f)}
              style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
            >
              {showForm ? 'Cancel' : '+ Push Goal'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goals.map(g => (
              <div key={g.id} style={{ background: '#1A1208', border: '1px solid rgba(212,134,10,0.3)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F5EDD8', marginBottom: 4, lineHeight: 1.4 }}>{g.goal_text}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, background: 'rgba(212,134,10,0.2)', color: '#D4860A', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                        {GOAL_TYPES.find(t => t.value === g.goal_type)?.label || g.goal_type}
                      </span>
                      {g.product_sku && (
                        <span style={{ fontSize: 10, background: 'rgba(124,58,237,0.2)', color: '#a78bfa', borderRadius: 4, padding: '2px 6px' }}>
                          #{g.product_sku}
                        </span>
                      )}
                      {g.target_cases && (
                        <span style={{ fontSize: 10, background: 'rgba(74,222,128,0.15)', color: '#4ade80', borderRadius: 4, padding: '2px 6px' }}>
                          → {g.target_cases} cases
                        </span>
                      )}
                      {g.target_pods && (
                        <span style={{ fontSize: 10, background: 'rgba(157,211,75,0.15)', color: '#9DC44B', borderRadius: 4, padding: '2px 6px' }}>
                          → {g.target_pods} PODs
                        </span>
                      )}
                      {g.target_date && (
                        <span style={{ fontSize: 10, color: '#9ca3af', borderRadius: 4, padding: '2px 6px' }}>
                          Due: {new Date(g.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={deleting === g.id}
                    style={{ fontSize: 14, color: 'rgba(245,237,216,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                    title="Deactivate goal"
                  >
                    {deleting === g.id ? '...' : '×'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '24px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>No active goals yet.</div>
          <button
            onClick={() => setShowForm(true)}
            style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Push First Goal
          </button>
        </div>
      )}

      {/* Goal creator form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1.5px solid #D4860A', boxShadow: '0 2px 8px rgba(212,134,10,0.15)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Push Team Goal</div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#ef4444', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Goal Description *</label>
              <textarea
                value={form.goal_text}
                onChange={e => setForm(f => ({ ...f, goal_text: e.target.value }))}
                placeholder="e.g. Land 3 new c-store accounts, Push Seize the Summer 6-pack SKUs"
                rows={2}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', color: '#1A1208' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Goal Type</label>
                <select
                  value={form.goal_type}
                  onChange={e => setForm(f => ({ ...f, goal_type: e.target.value }))}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff', color: '#1A1208' }}
                >
                  {GOAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Product / SKU</label>
                <input
                  type="text"
                  value={form.product_sku}
                  onChange={e => setForm(f => ({ ...f, product_sku: e.target.value }))}
                  placeholder="e.g. IPA, Summer 6pk"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', color: '#1A1208' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Target Cases</label>
                <input
                  type="number"
                  value={form.target_cases}
                  onChange={e => setForm(f => ({ ...f, target_cases: e.target.value }))}
                  placeholder="e.g. 200"
                  min="1"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Target PODs</label>
                <input
                  type="number"
                  value={form.target_pods}
                  onChange={e => setForm(f => ({ ...f, target_pods: e.target.value }))}
                  placeholder="e.g. 15"
                  min="1"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Target Date</label>
              <input
                type="date"
                value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Pushing...' : 'Push Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
