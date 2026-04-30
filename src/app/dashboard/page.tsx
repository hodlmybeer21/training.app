'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

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

const NAV_ITEMS = [
  { emoji: '🏠', label: 'Dashboard', id: 'dashboard', href: '/dashboard' },
  { emoji: '🎤', label: 'Practice', id: 'practice', href: '/dashboard/practice' },
  { emoji: '👥', label: 'Personas', id: 'personas', href: '/dashboard/personas' },
  { emoji: '⭐', label: 'Reviews', id: 'reviews', href: '/dashboard/reviews' },
  { emoji: '📈', label: 'Progress', id: 'progress', href: '/dashboard/progress' },
  { emoji: '⚙️', label: 'Settings', id: 'settings', href: '/dashboard/settings' },
];



function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#4ade80' : score >= 60 ? '#D4860A' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

function Sidebar({ active, onNav, supabase, user, profile, editingName, nameInput, setEditingName, setNameInput, setProfile }: { active: string; onNav: (id: string) => void; supabase: any; user: any; profile: any; editingName: boolean; nameInput: string; setEditingName: (v: boolean) => void; setNameInput: (v: string) => void; setProfile: any }) {
  return (
    <aside style={{ width: 220, background: '#13151F', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 0', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField AI</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Sales Training OS</div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { if (item.href) { window.location.href = item.href; } else { onNav(item.id); } }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%',
              background: active === item.id ? 'rgba(212,134,10,0.15)' : 'transparent',
              color: active === item.id ? '#FAC765' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '12px', background: 'rgba(212,134,10,0.1)', borderRadius: 10, border: '1px solid rgba(212,134,10,0.2)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#D4860A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Upgrade to Pro</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 10 }}>Unlimited simulations, team dashboards & custom personas.</div>
          <button style={{ width: '100%', padding: '8px', background: '#D4860A', border: 'none', borderRadius: 6, color: '#1A1208', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Upgrade</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (nameInput.trim() && profile) {
                  const updated = { ...profile, display_name: nameInput.trim() };
                  setProfile(updated);
                  await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: nameInput.trim() }) });
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D4860A, #FAC765)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1A1208', border: 'none', outline: 'none', padding: 0, textAlign: 'center' }}
            />
          ) : (
            <button onClick={() => { setNameInput(profile?.display_name || ''); setEditingName(true); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D4860A, #FAC765)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1A1208', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Click to edit name">
              {(profile?.avatar_initial || user?.email?.[0] || 'U').toUpperCase()}
            </button>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{profile?.display_name || user?.email?.split('@')[0] || 'User'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{user?.email} · click to sign out</div>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...props.style }}>
      {props.children}
    </div>
  );
}

function CardLabel(props: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 16 }}>{props.children}</div>;
}

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
};

function avgScore(sessions: Session[], field: string): number {
  const vals = sessions.map(s => (s as any)[field]).filter((v: number | null) => v != null);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function avgOverall(sessions: Session[]): number {
  const vals = sessions.map(s => s.overall_score).filter((v: number | null) => v != null);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return 'Today';
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scenarioEmoji(name: string): string {
  const n = name?.toLowerCase() || '';
  if (n.includes('cfo') || n.includes('finance')) return '😤';
  if (n.includes('grocery') || n.includes('chain')) return '🛒';
  if (n.includes('hostile') || n.includes('procurement')) return '🔥';
  if (n.includes('bar') || n.includes('restaurant') || n.includes('on-premise')) return '🍺';
  if (n.includes('liquor') || n.includes('package')) return '🏪';
  if (n.includes('convenience') || n.includes('c-store')) return '⛽';
  if (n.includes('district') || n.includes('manager')) return '📊';
  if (n.includes('route') || n.includes('rep')) return '🚚';
  if (n.includes('craft')) return '🏠';
  return '🎯';
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_initial: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
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
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const latest = sessions[0];
  const streak = sessions.filter(s => {
    const d = new Date(s.created_at);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3600000;
    return diffH < 48;
  }).length;
  const skillAvg = (field: string) => avgScore(sessions, field);
  const radarData = [
    { subject: 'Discovery', value: skillAvg('discovery') || 0, fullMark: 100 },
    { subject: 'Objection Handling', value: skillAvg('objection_handling') || 0, fullMark: 100 },
    { subject: 'Value Articulation', value: skillAvg('value_articulation') || 0, fullMark: 100 },
    { subject: 'Confidence & Pacing', value: skillAvg('confidence_pacing') || 0, fullMark: 100 },
    { subject: 'Closing Technique', value: skillAvg('closing_technique') || 0, fullMark: 100 },
  ];
  const progressData = sessions.slice(0, 10).reverse().map(s => ({
    date: formatDate(s.created_at),
    score: s.overall_score || 0,
  }));
  const skillBreakdown = [
    { name: 'Objection Handling', value: skillAvg('objection_handling'), color: '#4ade80' },
    { name: 'Confidence & Pacing', value: skillAvg('confidence_pacing'), color: '#9DC44B' },
    { name: 'Value Articulation', value: skillAvg('value_articulation'), color: '#D4860A' },
    { name: 'Discovery', value: skillAvg('discovery'), color: '#7C3AED' },
    { name: 'Closing Technique', value: skillAvg('closing_technique'), color: '#ef4444' },
  ];
  const recentSims = sessions.slice(0, 5);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .mobile-sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; width: 220px; z-index: 50; }
          .main-content { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: block !important; }
        }
      `}</style>
      {/* Sidebar — desktop: always visible; mobile: slide-in overlay */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 220,
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}
      className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <Sidebar active={activeNav} />
      </div>
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }} className="main-content">
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Hamburger — mobile only */}
          <button onClick={() => setMobileMenuOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, display: 'none' }}>
            ☰
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Welcome back, {profile?.display_name || user?.email?.split('@')[0] || 'User'}</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Your sales training hub — May 29, 2026</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#D4860A' }}>{streak}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recent Sessions</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{avgOverall(sessions) || '--'}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Avg Score</div>
            </div>
            <a href="/dashboard/practice" style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em', textDecoration: 'none' }}>
              🎤 Start Practice
            </a>
          </div>
        </header>

        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 20 }}>
          {/* ── TOP ROW ── */}

          {/* Skill Readiness Radar */}
          <Card style={{ gridColumn: '1 / 3' }}>
            <CardLabel>Skill Readiness Score</CardLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              {/* Score ring + label */}
              <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                <ScoreRing score={avgOverall(sessions) || 0} size={88} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{avgOverall(sessions) || '--'}</span>
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>/100</span>
                </div>
              </div>
              <div style={{ flex: 1, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius={75}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skills" dataKey="value" stroke="#D4860A" fill="#D4860A" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Last Simulation */}
          <Card>
            <CardLabel>Last Simulation</CardLabel>
            {loading ? <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading...</div> : latest ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                    <ScoreRing score={latest.overall_score || 0} size={56} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{latest.overall_score || '--'}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{latest.scenario_name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(latest.created_at)}</div>
                  </div>
                </div>
                {latest.strengths?.length ? <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 4 }}>✓ {latest.strengths[0]}</div> : null}
                {latest.opportunities?.length ? <div style={{ fontSize: 11, color: '#D4860A' }}>→ {latest.opportunities[0]}</div> : null}
                <button onClick={() => window.location.href = '/dashboard/reviews'} style={{ width: '100%', padding: '9px', background: 'transparent', border: '1.5px solid #D4860A', borderRadius: 8, color: '#D4860A', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 }}>Review Call →</button>
              </>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 12 }}>No sessions yet — <a href="/dashboard/practice" style={{ color: '#D4860A' }}>start practicing</a></div>
            )}
          </Card>

          {/* Recommended Next Drill */}
          <Card>
            <CardLabel>Recommended Next Drill</CardLabel>
            {latest?.recommended_drill ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6, lineHeight: 1.5 }}>{latest.recommended_drill.split(' ').slice(0, 10).join(' ')}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>Based on your lowest score</div>
                <a href="/dashboard/practice" style={{ display: 'block', width: '100%', padding: '9px', background: '#D4860A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>Practice Now →</a>
              </>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 12 }}>Complete a session to get a recommendation.</div>
            )}
          </Card>

          {/* Skill Breakdown (right column, next to Recommended Drill) */}
          <Card>
            <CardLabel>Skill Breakdown</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skillBreakdown.map(skill => (
                <div key={skill.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>{skill.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: skill.color }}>{skill.value}%</span>
                  </div>
                  <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${skill.value}%`, background: skill.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Progress Over Time */}
          <Card style={{ gridColumn: '1 / 3' }}>
            <CardLabel>Progress Over Time</CardLabel>
            <div style={{ height: 180 }}>
              {progressData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#D4860A" strokeWidth={2.5} dot={{ fill: '#D4860A', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 12 }}>
                  {progressData.length <= 1 ? 'More sessions needed to show trend' : 'No data'}
                </div>
              )}
            </div>
          </Card>

          {/* Recent Simulations */}
          <Card>
            <CardLabel>Recent Simulations</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentSims.length === 0 && !loading && <div style={{ color: '#9ca3af', fontSize: 12 }}>No sessions yet.</div>}
            {recentSims.map(sim => (
                <div key={sim.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{scenarioEmoji(sim.scenario_name)}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{sim.scenario_name}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{formatDate(sim.created_at)}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: (sim.overall_score || 0) >= 75 ? '#4ade80' : (sim.overall_score || 0) >= 60 ? '#D4860A' : '#ef4444'
                  }}>{sim.overall_score ?? '--'}</div>
                </div>
              ))}
            </div>
          </Card>

</div>
      </div>
    </div>
  );
}
