'use client';

import type { CSSProperties } from 'react';
import {
  SAMPLE_INCENTIVES,
  INCENTIVE_TYPE_LABEL,
  INCENTIVE_OUTCOME_LABEL,
  sampleProgressPercent,
  type SampleIncentive,
  type IncentiveGoalResult,
} from '@/lib/incentives';

const AMBER = '#D4860A';

const TYPE_COLOR: Record<SampleIncentive['type'], string> = {
  pod: '#7C3AED',
  volume: '#D4860A',
  display: '#0E7490',
  draft: '#15803d',
  seasonal: '#2563EB',
};

export function SampleBadge({ style }: { style?: CSSProperties }) {
  return (
    <span
      className="sample-badge"
      title="Fictional program for demos and practice. Not a real distributor or supplier program."
      style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, background: '#FDF3DC', color: '#92400e', border: '1px dashed rgba(212,134,10,0.6)', whiteSpace: 'nowrap', ...style }}
    >
      Sample program
    </span>
  );
}

function TypeChip({ incentive }: { incentive: SampleIncentive }) {
  const c = TYPE_COLOR[incentive.type];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: c + '18', color: c, whiteSpace: 'nowrap' }}>
      {INCENTIVE_TYPE_LABEL[incentive.type]}
    </span>
  );
}

export function IncentiveProgress({ incentive }: { incentive: SampleIncentive }) {
  const pct = sampleProgressPercent(incentive);
  const { current, goal, unit } = incentive.sampleProgress;
  const c = TYPE_COLOR[incentive.type];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{current} <span style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>of {goal} {unit}</span></span>
        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${incentive.name} sample progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${c}, ${c}cc)`, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, letterSpacing: '0.04em' }}>Sample progress for demo</div>
    </div>
  );
}

const label: CSSProperties = { fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 };

export function IncentiveCard({ incentive }: { incentive: SampleIncentive }) {
  return (
    <div className="incentive-card" style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `3px solid ${TYPE_COLOR[incentive.type]}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 24 }} aria-hidden="true">{incentive.emoji}</span>
        <SampleBadge />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{incentive.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <TypeChip incentive={incentive} />
          <span style={{ fontSize: 10, color: '#6b7280', padding: '3px 0' }}>{incentive.period} · {incentive.premise}</span>
        </div>
      </div>
      <IncentiveProgress incentive={incentive} />
      <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
        <div><strong>Target:</strong> {incentive.target}</div>
        <div><strong>Payout:</strong> {incentive.payout}</div>
      </div>
      <a
        href={`/dashboard/practice?incentive=${incentive.id}&persona=${incentive.personaId}`}
        style={{ marginTop: 'auto', display: 'block', padding: '9px', background: AMBER, borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
      >
        🎤 Practice this pitch
      </a>
    </div>
  );
}

/** Dashboard section: all sample incentive programs with labelled sample progress. */
export function IncentivesSection() {
  return (
    <section aria-labelledby="incentives-heading" className="incentives-section" style={{ padding: '24px 28px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 id="incentives-heading" style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>🏆 Incentives</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Sample programs with fictional brands, payouts and progress. Pick one and practice the pitch with a store owner.</p>
        </div>
      </div>
      <div className="incentives-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {SAMPLE_INCENTIVES.map(i => <IncentiveCard key={i.id} incentive={i} />)}
      </div>
    </section>
  );
}

/** Practice setup: the selected incentive's brief and talking points. */
export function IncentiveBrief({ incentive }: { incentive: SampleIncentive }) {
  return (
    <div className="incentive-brief" style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#FDF3DC', border: '1px solid rgba(212,134,10,0.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{incentive.emoji} Incentive goal</div>
        <SampleBadge />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{incentive.name}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0 12px' }}>
        <TypeChip incentive={incentive} />
        <span style={{ fontSize: 10, color: '#6b7280', padding: '3px 0' }}>{incentive.period} · {incentive.premise}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="incentive-brief-grid">
        <div><div style={label}>What counts</div><div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{incentive.counts}</div></div>
        <div>
          <div style={label}>Target</div><div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>{incentive.target}</div>
          <div style={label}>Rep payout</div><div style={{ fontSize: 12, color: '#374151' }}>{incentive.payout}</div>
        </div>
      </div>
      <div style={label}>Your ask</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Get them to agree to {incentive.ask}.</div>
      <div style={label}>Talking points</div>
      {incentive.talkingPoints.map(t => (
        <div key={t} style={{ fontSize: 12, color: '#374151', padding: '4px 0', display: 'flex', gap: 8, lineHeight: 1.5 }}><span style={{ color: AMBER }}>◆</span>{t}</div>
      ))}
      <div style={{ marginTop: 12 }}><IncentiveProgress incentive={incentive} /></div>
    </div>
  );
}

/** Review: did the rep advance the incentive goal? */
export function IncentiveGoalCard({ goal, incentive }: { goal: IncentiveGoalResult; incentive: SampleIncentive }) {
  const good = goal.outcome === 'committed' || goal.outcome === 'trial' || goal.outcome === 'next-step';
  const color = good ? '#15803d' : goal.outcome === 'declined' ? '#b45309' : '#dc2626';
  return (
    <div className="incentive-goal-card" style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: AMBER, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Incentive goal</div>
        <SampleBadge />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{incentive.emoji} {incentive.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }} aria-hidden="true">{good ? '✅' : goal.outcome === 'declined' ? '🟡' : '❌'}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color }}>{INCENTIVE_OUTCOME_LABEL[goal.outcome]}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{goal.asked ? 'You asked for it' : 'You did not make the ask'} · Goal score {goal.score}/100</div>
        </div>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${goal.score}%`, background: color, borderRadius: 3 }} />
      </div>
      {goal.evidence && <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, fontStyle: 'italic' }}>&ldquo;{goal.evidence}&rdquo;</div>}
    </div>
  );
}
