'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';

type Session = {
  id: string;
  created_at: string;
  scenario_name: string;
  overall_score: number | null;
  discovery: number | null;
  objection_handling: number | null;
  value_articulation: number | null;
  confidence_pacing: number | null;
  closing_technique: number | null;
  strengths: string[];
  opportunities: string[];
  coaching_tips: string[];
  recommended_drill: string | null;
  duration_seconds: number | null;
  transcript: string[];
};

const SCORE_COLORS: Record<string, string> = {
  discovery: '#7C3AED',
  objection_handling: '#4ade80',
  value_articulation: '#D4860A',
  confidence_pacing: '#9DC44B',
  closing_technique: '#ef4444',
};

const SCORE_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  objection_handling: 'Objection Handling',
  value_articulation: 'Value Articulation',
  confidence_pacing: 'Confidence & Pacing',
  closing_technique: 'Closing Technique',
};

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value ?? '--'}</span>
      </div>
      <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div style={{
          width: `${((value ?? 0) / 100) * 100}%`,
          background: color,
          height: '100%',
          borderRadius: 6,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function RadarChartSmall({ scores }: { scores: Session }) {
  const dims = ['discovery', 'objection_handling', 'value_articulation', 'confidence_pacing', 'closing_technique'];
  const labels = ['Discovery', 'Objection', 'Value', 'Confidence', 'Closing'];
  const colors = ['#7C3AED', '#4ade80', '#D4860A', '#9DC44B', '#ef4444'];

  return (
    <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Background rings */}
        {[25, 50, 75, 100].map(r => (
          <polygon
            key={r}
            points={dims.map((_, i) => {
              const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
              const radius = (r / 100) * 65;
              const cx = 80 + radius * Math.cos(angle);
              const cy = 80 + radius * Math.sin(angle);
              return `${cx},${cy}`;
            }).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        {/* Score polygon */}
        <polygon
          points={dims.map((dim, i) => {
            const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
            const radius = ((scores[dim as keyof Session] as number) ?? 0) / 100 * 65;
            const cx = 80 + radius * Math.cos(angle);
            const cy = 80 + radius * Math.sin(angle);
            return `${cx},${cy}`;
          }).join(' ')}
          fill={colors[0] + '30'}
          stroke={colors[0]}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Axis lines */}
        {dims.map((_, i) => {
          const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
          const cx = 80 + 65 * Math.cos(angle);
          const cy = 80 + 65 * Math.sin(angle);
          return <line key={i} x1="80" y1="80" x2={cx} y2={cy} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        {/* Labels */}
        {labels.map((label, i) => {
          const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
          const cx = 80 + 78 * Math.cos(angle);
          const cy = 80 + 78 * Math.sin(angle);
          return (
            <text key={i} x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#6b7280" fontWeight="600">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SessionCard({ session, selected, onSelect }: { session: Session; selected: boolean; onSelect: () => void }) {
  const scoreColor = (session.overall_score ?? 0) >= 75 ? '#4ade80' : (session.overall_score ?? 0) >= 60 ? '#D4860A' : '#ef4444';
  const d = new Date(session.created_at);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <button onClick={onSelect} style={{
      width: '100%', background: selected ? `${session.objection_handling ? '#D4860A' : '#D4860A'}15` : '#fff',
      border: `1.5px solid ${selected ? '#D4860A' : '#e5e7eb'}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, background: selected ? '#D4860A' : '#F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: selected ? '#fff' : '#374151', flexShrink: 0,
        }}>
          {session.overall_score ?? '--'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.scenario_name}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{dateStr} · {session.duration_seconds ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s` : '--'}</div>
        </div>
        <div style={{ fontSize: 16 }}>{selected ? '◀' : '▶'}</div>
      </div>
    </button>
  );
}

function DrillDownView({ session }: { session: Session }) {
  const d = new Date(session.created_at);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{session.scenario_name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{dateStr} · Session {session.id.slice(0, 8)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: (session.overall_score ?? 0) >= 75 ? '#4ade80' : (session.overall_score ?? 0) >= 60 ? '#D4860A' : '#ef4444', lineHeight: 1 }}>{session.overall_score ?? '--'}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Overall</div>
        </div>
      </div>

      {/* Scores + Radar */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Score Breakdown</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <RadarChartSmall scores={session} />
          <div style={{ flex: 1, minWidth: 180 }}>
            {Object.entries(SCORE_LABELS).map(([key, label]) => (
              <ScoreBar
                key={key}
                label={label}
                value={session[key as keyof Session] as number | null}
                color={SCORE_COLORS[key]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Strengths + Opportunities */}
      {((session.strengths?.length || session.opportunities?.length) ? true : false) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {session.strengths?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>✓ Strengths</div>
              {session.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>{s}</div>
              ))}
            </div>
          )}
          {session.opportunities?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D4860A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>→ Opportunities</div>
              {session.opportunities.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>{s}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coaching Tips */}
      {session.coaching_tips?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>🎯 Coaching Tips</div>
          {session.coaching_tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 6 }}>{tip}</div>
          ))}
        </div>
      )}

      {/* Recommended Drill */}
      {session.recommended_drill && (
        <div style={{ background: '#1A1208', borderRadius: 14, padding: 16, border: '1px solid rgba(212,134,10,0.3)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#D4860A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>🎯 Recommended Next Drill</div>
          <div style={{ fontSize: 13, color: '#F5EDD8', lineHeight: 1.6 }}>{session.recommended_drill}</div>
        </div>
      )}

      {/* Transcript */}
      {session.transcript?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Transcript</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {session.transcript.map((line, i) => {
              const isUser = line.toLowerCase().startsWith('user:');
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: isUser ? '#F3F4F6' : '#F5EDD8',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: isUser ? '#D4860A' : '#4ade80', flexShrink: 0, marginTop: 2,
                  }}>
                    {isUser ? 'YOU' : 'AI'}
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    {line.replace(/^(user|assistant):\s*/i, '').trim()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_initial: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); setNameInput(d.profile?.display_name || ''); })
      .catch(() => {});
    fetch('/api/sessions', {
      headers: { 'x-user-id': user?.id || '' },
    })
      .then(r => r.json())
      .then(d => {
        setSessions(d.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selected = sessions.find(s => s.id === selectedId) || null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Mobile sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: 220,
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}>
        <Sidebar active="reviews" />
      </div>
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      <div style={{ flex: 1, overflow: 'auto' }} className="main-content">
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setMobileMenuOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, display: 'none' }}>☰</button>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>⭐ Session Reviews</div>
        </header>

        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left: session list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              {loading ? 'Loading...' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
            </div>
            {!loading && sessions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af', fontSize: 13 }}>
                No sessions yet.<br /><a href="/dashboard/practice" style={{ color: '#D4860A' }}>Start practicing →</a>
              </div>
            )}
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                selected={selectedId === session.id}
                onSelect={() => setSelectedId(selectedId === session.id ? null : session.id)}
              />
            ))}
          </div>

          {/* Right: drill-down */}
          <div>
            {selected ? (
              <DrillDownView session={selected} />
            ) : (
              <div style={{
                background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: '#9ca3af', fontSize: 14,
              }}>
                ← Select a session from the left to see the full breakdown
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .hamburger-btn { display: block !important; }
        }
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .main-content { margin-left: 0 !important; }
          div[style*="grid-template-columns: 320px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
