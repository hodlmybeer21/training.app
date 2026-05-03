'use client';
import { useState, useEffect } from 'react';

interface CustomPersona {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  system_prompt: string;
  opening_line: string;
  scoring_hints: string;
  active: boolean;
  created_at: string;
}

const EMOJI_OPTIONS = ['🎯','💼','🍺','📋','🚪','🔥','🤝','😤','💪','⭐','🎤','📞','🗣️','🏆','💡','🔍'];
const COLOR_OPTIONS = ['#D4860A','#7C3AED','#4ade80','#ef4444','#3b82f6','#f97316','#ec4899','#06b6d4','#84cc16','#8b5cf6'];

export default function PersonaCreator() {
  const [personas, setPersonas] = useState<CustomPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#D4860A');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [openingLine, setOpeningLine] = useState('');
  const [scoringHints, setScoringHints] = useState('');

  useEffect(() => { fetchPersonas(); }, []);

  async function fetchPersonas() {
    setLoading(true);
    try {
      const res = await fetch('/api/personas');
      const data = await res.json();
      setPersonas(data.personas || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !systemPrompt || !openingLine) return;
    setSaving(true);
    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, color, description, systemPrompt, openingLine, scoringHints }),
      });
      if (res.ok) {
        setName(''); setSystemPrompt(''); setOpeningLine(''); setScoringHints('');
        setDescription('');
        setView('list');
        fetchPersonas();
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleToggle(p: CustomPersona) {
    await fetch(`/api/personas?id=${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    fetchPersonas();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/personas?id=${id}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchPersonas();
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        .pc-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pc-full { grid-column: 1 / -1; }
        .pc-label { font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
        .pc-input { width: 100%; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #1A1208; box-sizing: border-box; }
        .pc-input:focus { outline: none; border-color: #D4860A; }
        .pc-textarea { width: 100%; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #1A1208; resize: vertical; min-height: 80px; box-sizing: border-box; }
        .pc-textarea:focus { outline: none; border-color: #D4860A; }
        .pc-emoji-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
        .pc-emoji-btn { height: 36px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.15s; }
        .pc-emoji-btn.selected { border-color: #D4860A; background: #fff7ed; }
        .pc-color-row { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
        .pc-color-dot { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: all 0.15s; flex-shrink: 0; }
        .pc-color-dot.selected { border-color: #111; transform: scale(1.15); }
        .pc-toggle { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; cursor: pointer; border: none; }
        .pc-toggle.on { background: #d1fae5; color: #065f46; }
        .pc-toggle.off { background: #fee2e2; color: #991b1b; }
        .pc-delete { padding: 4px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; cursor: pointer; border: none; background: #f3f4f6; color: #9ca3af; }
        .pc-delete:hover { background: #fee2e2; color: #991b1b; }
        @media (max-width: 640px) {
          .pc-form { grid-template-columns: 1fr !important; gap: 10px !important; }
          .pc-full { grid-column: 1 !important; }
          .pc-emoji-grid { grid-template-columns: repeat(6, 1fr) !important; }
          .pc-form-container { max-width: 100% !important; overflow-x: hidden !important; padding-left: 0 !important; padding-right: 0 !important; }
          .pc-form-container * { max-width: 100% !important; box-sizing: border-box !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Custom Personas</div>
        <button
          onClick={() => setView(view === 'list' ? 'create' : 'list')}
          style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {view === 'list' ? '+ New' : '← Back'}
        </button>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>Loading...</div>}
          {!loading && personas.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No personas yet. Tap <strong style={{ color: '#D4860A' }}>+ New</strong> to create one.
            </div>
          )}
          {personas.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: p.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {p.scoring_hints && <span style={{ fontSize: 9, background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: 8 }}>🎯</span>}
                  <button className={`pc-toggle ${p.active ? 'on' : 'off'}`} onClick={() => handleToggle(p)}>{p.active ? 'On' : 'Off'}</button>
                  <button className="pc-delete" onClick={() => setDeleteId(p.id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      {view === 'create' && (
        <form
          onSubmit={handleSave}
          style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          className="pc-form-container"
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>New Persona</div>

          <div className="pc-form">
            {/* Name */}
            <div>
              <div className="pc-label">Name *</div>
              <input className="pc-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Skeptic Grocery Buyer" required />
            </div>

            {/* Description */}
            <div>
              <div className="pc-label">Description</div>
              <input className="pc-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" />
            </div>

            {/* Emoji */}
            <div className="pc-full">
              <div className="pc-label">Emoji</div>
              <div className="pc-emoji-grid">
                {EMOJI_OPTIONS.map(e => (
                  <button type="button" key={e} className={`pc-emoji-btn ${emoji === e ? 'selected' : ''}`}
                    onClick={() => setEmoji(e)}>{e}</button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="pc-full">
              <div className="pc-label">Color</div>
              <div className="pc-color-row">
                {COLOR_OPTIONS.map(c => (
                  <div key={c} className={`pc-color-dot ${color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)} />
                ))}
              </div>
            </div>

            {/* Character Instructions */}
            <div className="pc-full">
              <div className="pc-label">Character Instructions *</div>
              <textarea className="pc-textarea" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                placeholder={'You are a skeptical grocery chain buyer. You push back on pricing, question value, and need concrete proof. Keep responses short (1-3 sentences).'}
                style={{ minHeight: 72 }} required />
            </div>

            {/* Opening Line */}
            <div className="pc-full">
              <div className="pc-label">Opening Line *</div>
              <input className="pc-input" value={openingLine} onChange={e => setOpeningLine(e.target.value)}
                placeholder="How this persona starts the conversation" required />
            </div>

            {/* Scoring Hints */}
            <div className="pc-full">
              <div className="pc-label">Scoring Hints</div>
              <textarea className="pc-textarea" value={scoringHints} onChange={e => setScoringHints(e.target.value)}
                placeholder={'What should the AI look for when scoring reps on this persona?\nE.g. "Look for: asks about shelf space before pitching"'}>
              </textarea>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => setView('list')}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !name || !systemPrompt || !openingLine}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#D4860A', color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, maxWidth: 300, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete persona?</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}