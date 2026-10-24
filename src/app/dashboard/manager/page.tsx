'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import DashboardNav from '@/components/DashboardNav';
import GoalsPanel from './GoalsPanel';
import PersonaCreator from './PersonaCreator';

const SKILL_KEYS = ['discovery', 'objection_handling', 'value_articulation', 'confidence_pacing', 'closing_technique'] as const;
const SKILL_SHORT: Record<string, string> = {
  discovery: 'Discovery',
  objection_handling: 'Objection',
  value_articulation: 'Value Prop',
  confidence_pacing: 'Confidence',
  closing_technique: 'Closing',
};
const SKILL_COLORS: Record<string, string> = {
  discovery: '#7C3AED',
  objection_handling: '#4ade80',
  value_articulation: '#D4860A',
  confidence_pacing: '#9DC44B',
  closing_technique: '#ef4444',
};

type RepProfile = { id: string; display_name: string | null; avatar_initial: string | null; role: string };
type Session = {
  id: string; created_at: string; scenario_name: string; overall_score: number | null;
  discovery: number | null; objection_handling: number | null; value_articulation: number | null;
  confidence_pacing: number | null; closing_technique: number | null;
  strengths: string[]; opportunities: string[]; coaching_tips: string[];
  recommended_drill: string | null; duration_seconds: number | null; transcript: string[];
};

function avg(values: number[]): number | null {
  const nums = values.filter((v) => v !== null && !isNaN(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value ?? '--'}</span>
      </div>
      <div style={{ background: '#f3f4f6', borderRadius: 5, height: 7, overflow: 'hidden' }}>
        <div style={{ width: `${((value ?? 0) / 100) * 100}%`, background: color, height: '100%', borderRadius: 5, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function RadarSmall({ radarData }: { radarData: { subject: string; value: number }[] }) {
  return (
    <div style={{ width: 120, height: 120, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="52">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#6b7280' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Skills" dataKey="value" stroke="#D4860A" fill="#D4860A" fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Mobile inline rep detail — shown directly under the rep card
function RepDetailInline({ rep, onSessionSelect, selectedSessionId }: { rep: any; onSessionSelect: (id: string) => void; selectedSessionId: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Compact stats row */}
      <div style={{ display: 'flex', gap: 16, background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#D4860A' }}>{rep.session_count}</div>
          <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED' }}>{rep.avg_overall ?? '--'}</div>
          <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg</div>
        </div>
      </div>

      {/* Skill breakdown compact */}
      {rep.radarData && rep.radarData.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Skill Breakdown</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RadarSmall radarData={rep.radarData} />
            <div style={{ flex: 1 }}>
              {SKILL_KEYS.map((key) => {
                const skillData = rep.radarData.find((r: any) =>
                  r.subject.toLowerCase().replace(/ /g, '_').includes(key)
                );
                return (
                  <ScoreBar key={key} label={SKILL_SHORT[key]}
                    value={(skillData?.value as number | null) ?? null}
                    color={SKILL_COLORS[key]}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Session list */}
      {rep.recentSessions && rep.recentSessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rep.recentSessions.map((session: any) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(selectedSessionId === session.id ? null : session.id)}
              style={{
                width: '100%', background: selectedSessionId === session.id ? '#FAFAF8' : '#F9FAFB',
                border: `1.5px solid ${selectedSessionId === session.id ? '#D4860A' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6, background: selectedSessionId === session.id ? '#D4860A' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: selectedSessionId === session.id ? '#fff' : '#374151', flexShrink: 0,
                }}>
                  {session.overall_score ?? '--'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.scenario_name}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>
                    {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {selectedSessionId === session.id ? '▲' : '▼'}
                </div>
              </div>
              {selectedSessionId === session.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                  <DrillDownView session={session} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DrillDownView({ session }: { session: Session }) {
  const d = new Date(session.created_at);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const scoreColor = (session.overall_score ?? 0) >= 75 ? '#15803d' : (session.overall_score ?? 0) >= 60 ? '#D4860A' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{session.scenario_name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{dateStr}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{session.overall_score ?? '--'}</div>
          <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Overall</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Score Breakdown</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <RadarSmall radarData={SKILL_KEYS.map((key) => ({ subject: SKILL_SHORT[key], value: (session[key] as number) ?? 0 }))} />
          <div style={{ flex: 1, minWidth: 160 }}>
            {SKILL_KEYS.map((key) => (
              <ScoreBar key={key} label={SKILL_SHORT[key]} value={(session[key] as number) ?? null} color={SKILL_COLORS[key]} />
            ))}
          </div>
        </div>
      </div>

      {session.coaching_tips?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Coaching Tips</div>
          {session.coaching_tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 6 }}>{tip}</div>
          ))}
        </div>
      )}

      {session.recommended_drill && (
        <div style={{ background: '#1A1208', borderRadius: 14, padding: 16, border: '1px solid rgba(212,134,10,0.3)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#D4860A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Recommended Next Drill</div>
          <div style={{ fontSize: 13, color: '#F5EDD8', lineHeight: 1.6 }}>{session.recommended_drill}</div>
        </div>
      )}
    </div>
  );
}

export default function ManagerPage() {
  const [reps, setReps] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<{ team_session_count: number; team_avg_overall: number | null }>({ team_session_count: 0, team_avg_overall: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [view, setView] = useState<'team' | 'goals' | 'personas'>('team');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/team')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => {
        if (d.reps) setReps(d.reps);
        if (d.team_session_count !== undefined) setTeamStats(d);
        setLoading(false);
      })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const selectedRep = reps.find((r) => r.profile.id === selectedRepId) || null;
  const selectedSession = selectedRep?.recentSessions?.find((s: any) => s.id === selectedSessionId) || null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>

      <div style={{ flex: 1, overflow: 'auto', marginLeft: 0 }} className="main-content">
        <header className="manager-header" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <DashboardNav active="manager" />
          <h1 className="dash-page-title" style={{ fontSize: 20 }}><span aria-hidden="true">🎯 </span>Team Dashboard</h1>
          <div className="manager-tabs" role="group" aria-label="Team views" style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button
              onClick={() => setView('team')}
              aria-pressed={view === 'team'}
              type="button"
              style={{ background: view === 'team' ? '#D4860A' : 'transparent', color: view === 'team' ? '#fff' : '#6b7280', border: `1.5px solid ${view === 'team' ? '#D4860A' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <span aria-hidden="true">👥 </span>Team
            </button>
            <button
              onClick={() => setView('personas')}
              aria-pressed={view === 'personas'}
              type="button"
              style={{ background: view === 'personas' ? '#D4860A' : 'transparent', color: view === 'personas' ? '#fff' : '#6b7280', border: `1.5px solid ${view === 'personas' ? '#D4860A' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <span aria-hidden="true">🎨 </span>Personas
            </button>
            <button
              onClick={() => setView('goals')}
              aria-pressed={view === 'goals'}
              type="button"
              style={{ background: view === 'goals' ? '#D4860A' : 'transparent', color: view === 'goals' ? '#fff' : '#6b7280', border: `1.5px solid ${view === 'goals' ? '#D4860A' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <span aria-hidden="true">🎯 </span>Team Goals
            </button>
          </div>
        </header>

        {view === 'personas' ? (
          <div className="manager-pad" style={{ padding: 28 }}>
            <PersonaCreator />
          </div>
        ) : view === 'goals' ? (
          <div className="manager-pad" style={{ padding: 28 }}>
            <GoalsPanel />
          </div>
        ) : (
        <>

        {/* Team stats bar */}
        <div className="manager-stats" style={{ display: 'flex', gap: 24, padding: '20px 28px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#D4860A' }}>{reps.length}</div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team Size</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED' }}>{teamStats.team_session_count}</div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Sessions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: teamStats.team_avg_overall !== null ? '#15803d' : '#9ca3af' }}>
              {teamStats.team_avg_overall ?? '--'}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team Avg Score</div>
          </div>
        </div>

        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }} className="manager-grid">
          {/* Left: rep list + optional inline detail on mobile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="manager-reps">
            {loading ? (
              <div role="status" className="dash-state">Loading team data…</div>
            ) : loadError ? (
              <div role="alert" className="dash-state dash-state-error">
                We couldn&apos;t load your team just now.{' '}
                <button type="button" className="dash-retry" onClick={() => window.location.reload()}>Try again</button>
              </div>
            ) : reps.length === 0 ? (
              <div className="dash-state">
                No reps on your team yet. Your account admin adds teammates, and their practice sessions will show up here once they start.
              </div>
            ) : (
              reps.map((rep) => {
                const scoreColor = (rep.avg_overall ?? 0) >= 75 ? '#15803d' : (rep.avg_overall ?? 0) >= 60 ? '#D4860A' : '#ef4444';
                const isSelected = selectedRepId === rep.profile.id;
                return (
                  <div key={rep.profile.id}>
                    <button
                      type="button"
                      aria-expanded={isSelected}
                      onClick={() => {
                        setSelectedRepId(isSelected ? null : rep.profile.id);
                        if (!isSelected) { setSelectedRepId(rep.profile.id); setSelectedSessionId(null); }
                      }}
                      style={{
                        width: '100%', background: isSelected ? '#FAFAF8' : '#fff',
                        border: `1.5px solid ${isSelected ? '#D4860A' : '#e5e7eb'}`,
                        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10, background: isSelected ? '#D4860A' : '#F3F4F6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 800, color: isSelected ? '#fff' : '#374151', flexShrink: 0,
                        }}>
                          {rep.avg_overall ?? '--'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rep.profile.display_name || 'Rep'}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {rep.session_count} session{rep.session_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div aria-hidden="true" style={{ fontSize: 12, color: '#6b7280' }}>
                          {isSelected ? '▲' : '▼'}
                        </div>
                      </div>
                    </button>

                    {/* Desktop: highlight only (no expand); Mobile: expand inline */}
                    {isSelected && (
                      <div style={{ padding: '12px 0 4px' }} className="mobile-expand desktop-expand">
                        <RepDetailInline rep={rep} onSessionSelect={setSelectedSessionId} selectedSessionId={selectedSessionId} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: rep detail — stacks below reps on mobile */}
          <div className="manager-detail-desktop">
            {selectedRep ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Rep header */}
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
                    {selectedRep.profile.display_name || 'Rep'} — Session History
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#D4860A' }}>{selectedRep.session_count}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>{selectedRep.avg_overall ?? '--'}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Score</div>
                    </div>
                  </div>
                </div>

                {/* Radar for this rep */}
                {selectedRep.radarData && selectedRep.radarData.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Skill Breakdown</div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                      <RadarSmall radarData={selectedRep.radarData} />
                      <div style={{ flex: 1, minWidth: 160 }}>
                        {SKILL_KEYS.map((key) => {
                          const skillData = selectedRep.radarData.find((r: any) =>
                            r.subject.toLowerCase().replace(/ /g, '_').includes(key)
                          );
                          return (
                            <ScoreBar key={key} label={SKILL_SHORT[key]}
                              value={(skillData?.value as number | null) ?? null}
                              color={SKILL_COLORS[key]}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Session list */}
                {selectedRep.recentSessions && selectedRep.recentSessions.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Recent Sessions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedRep.recentSessions.map((session: any) => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSessionId(selectedSessionId === session.id ? null : session.id)}
                          style={{
                            width: '100%', background: selectedSessionId === session.id ? '#FAFAF8' : '#F9FAFB',
                            border: `1.5px solid ${selectedSessionId === session.id ? '#D4860A' : '#e5e7eb'}`,
                            borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                            textAlign: 'left', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 8, background: selectedSessionId === session.id ? '#D4860A' : '#e5e7eb',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 800, color: selectedSessionId === session.id ? '#fff' : '#374151', flexShrink: 0,
                            }}>
                              {session.overall_score ?? '--'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {session.scenario_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {selectedSessionId === session.id ? '▲' : '▼'}
                            </div>
                          </div>
                          {selectedSessionId === session.id && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                              <DrillDownView session={session} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: '#6b7280', fontSize: 14, marginTop: 20,
              }}>
                Select a rep from the left to see their session history and skill breakdown.
              </div>
            )}
          </div>
        </div>
      </>
      )}
    </div>

      <style>{`
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; flex: none !important; }
          .manager-grid { grid-template-columns: minmax(0, 1fr) !important; padding: 16px !important; }
          .manager-pad { padding: 16px !important; }
          .manager-stats { padding: 16px !important; justify-content: space-around; }
          .manager-tabs { margin-left: 0 !important; width: 100%; }
          .manager-tabs button { flex: 1; padding: 8px 6px !important; }
          .manager-detail-desktop { display: none !important; }
          .mobile-expand { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-expand { display: none !important; }
        }
      `}</style>
    </div>
  );
}
