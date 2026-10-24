'use client';
import { useState, useEffect } from 'react';
import DashboardNav from '@/components/DashboardNav';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
};

const SKILLS: { key: keyof Session; label: string; color: string }[] = [
  { key: 'discovery', label: 'Discovery', color: '#7C3AED' },
  { key: 'objection_handling', label: 'Objection Handling', color: '#16a34a' },
  { key: 'value_articulation', label: 'Value Articulation', color: '#D4860A' },
  { key: 'confidence_pacing', label: 'Confidence & Pacing', color: '#65a30d' },
  { key: 'closing_technique', label: 'Closing Technique', color: '#dc2626' },
];

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...style }}>{children}</div>;
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 16 }}>{children}</h2>;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#6b7280' }}>—</span>;
  const color = value > 0 ? '#15803d' : value < 0 ? '#b91c1c' : '#6b7280';
  const sign = value > 0 ? '+' : '';
  return <span style={{ color, fontWeight: 700 }}>{sign}{value}</span>;
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('/api/sessions?limit=100')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  // API returns newest first; charts read oldest to newest.
  const chronological = [...sessions].reverse();
  const scored = chronological.filter(s => typeof s.overall_score === 'number');
  const chartData = scored.slice(-20).map(s => ({
    date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.overall_score,
    scenario: s.scenario_name,
  }));
  const overallAvg = avg(scored.map(s => s.overall_score));
  const best = scored.length ? Math.max(...scored.map(s => s.overall_score as number)) : null;
  const recent = scored.slice(-3);
  const earlier = scored.slice(0, Math.max(0, scored.length - 3)).slice(-3);
  const recentAvg = avg(recent.map(s => s.overall_score));
  const earlierAvg = avg(earlier.map(s => s.overall_score));
  const trend = recentAvg !== null && earlierAvg !== null ? recentAvg - earlierAvg : null;

  const skillRows = SKILLS.map(skill => {
    const all = avg(chronological.map(s => s[skill.key] as number | null));
    const r = avg(recent.map(s => s[skill.key] as number | null));
    const e = avg(earlier.map(s => s[skill.key] as number | null));
    return { ...skill, all, change: r !== null && e !== null ? r - e : null };
  });
  const weakest = skillRows.filter(r => r.all !== null).sort((a, b) => (a.all as number) - (b.all as number))[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .progress-body { padding: 16px !important; }
          .progress-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div style={{ flex: 1, minWidth: 0 }} className="main-content">
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <DashboardNav active="progress" />
          <h1 className="dash-page-title" style={{ fontSize: 20 }}><span aria-hidden="true">📈 </span>Progress</h1>
        </header>

        <div className="progress-body" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
          {loading ? (
            <div role="status" className="dash-state">Loading your progress…</div>
          ) : loadError ? (
            <div role="alert" className="dash-state dash-state-error">
              We couldn&apos;t load your sessions.{' '}
              <button type="button" className="dash-retry" onClick={() => window.location.reload()}>Try again</button>
            </div>
          ) : scored.length === 0 ? (
            <div className="dash-state">
              No scored sessions yet. Finish a practice call and your score trend and skill changes show up here.<br />
              <a href="/dashboard/practice">Start a practice call →</a>
            </div>
          ) : (
            <>
              <div className="progress-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Scored sessions', value: scored.length, color: '#D4860A' },
                  { label: 'Average score', value: overallAvg ?? '--', color: '#111827' },
                  { label: 'Best score', value: best ?? '--', color: '#15803d' },
                  { label: 'Last 3 vs before', value: trend === null ? '—' : `${trend > 0 ? '+' : ''}${trend}`, color: trend === null ? '#6b7280' : trend >= 0 ? '#15803d' : '#b91c1c' },
                ].map(stat => (
                  <Card key={stat.label} style={{ padding: 20 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>

              <Card>
                <CardLabel>Overall score over time</CardLabel>
                {chartData.length > 1 ? (
                  <div style={{ height: 240 }} role="img" aria-label={`Overall scores, oldest to newest: ${chartData.map(d => d.score).join(', ')}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                        <CartesianGrid stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <Line type="monotone" dataKey="score" name="Score" stroke="#D4860A" strokeWidth={2.5} dot={{ fill: '#D4860A', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#6b7280' }}>One more scored session and your trend line appears here.</p>
                )}
              </Card>

              <Card>
                <CardLabel>Skills</CardLabel>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #f3f4f6' }}>
                        <th scope="col" style={{ textAlign: 'left', padding: '8px 8px 8px 0', color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skill</th>
                        <th scope="col" style={{ textAlign: 'left', padding: 8, color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', width: '45%' }}>Average</th>
                        <th scope="col" style={{ textAlign: 'right', padding: '8px 0 8px 8px', color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skillRows.map(row => (
                        <tr key={row.key} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <th scope="row" style={{ textAlign: 'left', padding: '12px 8px 12px 0', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{row.label}</th>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ width: `${row.all ?? 0}%`, height: '100%', background: row.color, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontWeight: 700, color: '#374151', minWidth: 28, textAlign: 'right' }}>{row.all ?? '--'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 0 12px 8px', textAlign: 'right' }}><Delta value={row.change} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
                  Recent change compares your last 3 sessions with the 3 before them.
                  {weakest ? <> Your lowest skill right now is <strong style={{ color: '#374151' }}>{weakest.label}</strong>. <a href="/dashboard/practice" style={{ color: '#b45309', fontWeight: 600 }}>Practice it →</a></> : null}
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
