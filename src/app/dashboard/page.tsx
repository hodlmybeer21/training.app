'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import DashboardNav from '@/components/DashboardNav';
import { IncentivesSection } from '@/components/Incentives';
import { User } from '@supabase/supabase-js';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
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

function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...props.style }}>
      {props.children}
    </div>
  );
}

function CardLabel(props: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 16 }}>{props.children}</div>;
}

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
  if (n.includes('liquor') || n.includes('package') || n.includes('wine shop')) return '🏪';
  if (n.includes('convenience') || n.includes('c-store')) return '⛽';
  if (n.includes('district') || n.includes('manager')) return '📊';
  if (n.includes('route') || n.includes('rep')) return '🚚';
  if (n.includes('craft')) return '🏠';
  return '🎯';
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_initial: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [now] = useState(() => Date.now());
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});
    fetch('/api/sessions')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
    fetch('/api/goals')
      .then(r => r.json())
      .then(d => { if (d.goals) setGoals(d.goals); })
      .catch(() => {});
  }, []);

  const latest = sessions[0];
  const weekCount = sessions.filter(s => {
    const diffH = (now - new Date(s.created_at).getTime()) / 3600000;
    return diffH < 24 * 7;
  }).length;
  const skillAvg = (field: string) => avgScore(sessions, field);
  const radarData = [
    { subject: 'Discovery', value: skillAvg('discovery') || 0, fullMark: 100 },
    { subject: 'Objection', value: skillAvg('objection_handling') || 0, fullMark: 100 },
    { subject: 'Value Prop', value: skillAvg('value_articulation') || 0, fullMark: 100 },
    { subject: 'Confidence', value: skillAvg('confidence_pacing') || 0, fullMark: 100 },
    { subject: 'Closing', value: skillAvg('closing_technique') || 0, fullMark: 100 },
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }} className="main-content">
        {/* Header */}
        <header className="dash-header" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <DashboardNav active="dashboard" />
            <div>
              <h1 className="dash-page-title">Welcome back, {profile?.display_name || user?.email?.split('@')[0] || 'there'}</h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Your sales training hub</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#D4860A' }}>{weekCount}</div>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sessions this week</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{avgOverall(sessions) || '--'}</div>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Avg Score</div>
            </div>
            <a href="/dashboard/practice" style={{ background: '#D4860A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em', textDecoration: 'none' }}>
              🎤 Start Practice
            </a>
          </div>
        </header>

        {loadError && (
          <div role="alert" className="dash-state dash-state-error dash-banner" style={{ margin: '20px 28px 0', padding: '14px 18px', textAlign: 'left' }}>
            We couldn&apos;t load your sessions just now, so the numbers below may be empty.{' '}
            <button type="button" className="dash-retry" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}

        {goals.length > 0 && (
          <div className="dash-banner" style={{ margin: '20px 28px 0', padding: '14px 18px', background: '#1A1208', border: '1px solid rgba(212,134,10,0.35)', borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#D4860A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🎯 Team Goals Active</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {goals.map(g => (
                <div key={g.id} style={{ fontSize: 12, color: '#F5EDD8', lineHeight: 1.5 }}>
                  • {g.goal_text}
                  {g.target_cases && <span style={{ color: '#D4860A', marginLeft: 8 }}>→ {g.target_cases} cases</span>}
                  {g.target_pods && <span style={{ color: '#9DC44B', marginLeft: 8 }}>→ {g.target_pods} PODs</span>}
                  {g.product_sku && <span style={{ color: '#7C3AED', marginLeft: 8 }}>#{g.product_sku}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <IncentivesSection />

        <div className="dash-grid" style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 20 }}>
          {/* Skill Readiness Radar */}
          <Card style={{ gridColumn: '1 / 3' }}>
            <CardLabel>Skill Readiness Score</CardLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                <ScoreRing score={avgOverall(sessions) || 0} size={88} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{avgOverall(sessions) || '--'}</span>
                  <span style={{ fontSize: 9, color: '#6b7280' }}>/100</span>
                </div>
              </div>
              <div style={{ flex: '1 1 220px', height: 200, minWidth: 0 }} role="img" aria-label={`Skill radar: ${radarData.map(d => `${d.subject} ${d.value}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="68%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#4b5563' }} />
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
            {loading ? <div role="status" style={{ color: '#6b7280', fontSize: 12 }}>Loading…</div> : latest ? (
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
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{formatDate(latest.created_at)}</div>
                  </div>
                </div>
                {latest.strengths?.length ? <div style={{ fontSize: 11, color: '#15803d', marginBottom: 4 }}>✓ {latest.strengths[0]}</div> : null}
                {latest.opportunities?.length ? <div style={{ fontSize: 11, color: '#b45309' }}>→ {latest.opportunities[0]}</div> : null}
                <a href="/dashboard/reviews" style={{ display: 'block', width: '100%', padding: '9px', background: 'transparent', border: '1.5px solid #D4860A', borderRadius: 8, color: '#D4860A', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', marginTop: 10 }}>Review Call →</a>
              </>
            ) : (
              <div style={{ color: '#6b7280', fontSize: 12 }}>No sessions yet — <a href="/dashboard/practice" style={{ color: '#D4860A' }}>start practicing</a></div>
            )}
          </Card>

          {/* Recommended Next Drill */}
          <Card>
            <CardLabel>Recommended Next Drill</CardLabel>
            {latest?.recommended_drill ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6, lineHeight: 1.5 }}>{latest.recommended_drill.split(' ').slice(0, 10).join(' ')}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14 }}>Based on your lowest score</div>
                <a href="/dashboard/practice" style={{ display: 'block', width: '100%', padding: '9px', background: '#D4860A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>Practice Now →</a>
              </>
            ) : (
              <div style={{ color: '#6b7280', fontSize: 12 }}>Complete a session to get a recommendation.</div>
            )}
          </Card>

          {/* Skill Breakdown */}
          <Card>
            <CardLabel>Skill Breakdown</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skillBreakdown.map(skill => (
                <div key={skill.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>{skill.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{skill.value}%</span>
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
                <LineChart data={progressData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#D4860A" strokeWidth={2.5} dot={{ fill: '#D4860A', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: 12 }}>
                  More sessions needed to show trend
                </div>
              )}
            </div>
          </Card>

          {/* Recent Simulations */}
          <Card>
            <CardLabel>Recent Simulations</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentSims.length === 0 && !loading && <div style={{ color: '#6b7280', fontSize: 12 }}>No sessions yet.</div>}
              {recentSims.map(sim => (
                <div key={sim.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{scenarioEmoji(sim.scenario_name)}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{sim.scenario_name}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{formatDate(sim.created_at)}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: (sim.overall_score || 0) >= 75 ? '#15803d' : (sim.overall_score || 0) >= 60 ? '#b45309' : '#dc2626'
                  }}>{sim.overall_score ?? '--'}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        .main-content { width: 100%; }
      `}</style>
    </div>
  );
}