const fs = require('fs');
const path = '/root/.openclaw/workspace/training.app/src/app/dashboard/practice/page.tsx';

// We'll build the file in parts
const parts = [];

// Part 1: imports + types + constants + mock data
parts.push(`'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PERSONAS, Persona } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';

const ALL_PERSONAS = [...PERSONAS, ...NH_PERSONAS];

type Phase = 'setup' | 'live' | 'analysis';
type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
type Message = { role: 'system' | 'user' | 'assistant'; content: string; annotation?: string };

const INDUSTRIES = ['Grocery & Retail', 'C-Stores', 'Liquor Stores', 'Bars & Restaurants', 'Craft & Specialty', 'Internal / Distributor', 'Competitive / Win-Back'];
const DEAL_STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closing', 'Renewal'];
const DIFFICULTIES = ['Warm Up', 'Standard', 'Challenging', 'Hostile'];

const NAV_ITEMS = [
  { emoji: '🏠', label: 'Dashboard', id: 'dashboard', href: '/dashboard' },
  { emoji: '🎤', label: 'Practice', id: 'practice', href: '/dashboard/practice' },
  { emoji: '👥', label: 'Personas', id: 'personas', href: '#' },
  { emoji: '⭐', label: 'Reviews', id: 'reviews', href: '#' },
  { emoji: '📈', label: 'Progress', id: 'progress', href: '#' },
  { emoji: '⚙️', label: 'Settings', id: 'settings', href: '#' },
];

const MOCK_ANALYSIS = {
  overall: 84,
  skills: [
    { name: 'Objection Handling', value: 91, color: '#4ade80' },
    { name: 'Value Articulation', value: 78, color: '#9DC44B' },
    { name: 'Confidence & Pacing', value: 85, color: '#D4860A' },
    { name: 'Closing Technique', value: 72, color: '#D4860A' },
  ],
  coachTips: [
    'You handled the price objection well by anchoring on total margin rather than per-case cost — strong move.',
    'Consider closing earlier in the conversation; you circled back to the same topic twice without asking for commitment.',
    'Your pacing was solid overall, but you rushed through the ROI section — slow down when stating numbers.',
  ],
  transcript: [
    { role: 'assistant', content: "So you're telling me I should rip up a relationship I've had for almost a decade... for what? What's in it for me, specifically, in the next 90 days?", annotation: 'Initial skepticism — expected' },
    { role: 'user', content: "I understand that. What I'm offering isn't just a product switch — it's a margin improvement. Our data shows retailers in your category see an average 8% margin lift in the first quarter." },
    { role: 'assistant', content: "Every distributor promises me margin. What makes your numbers real?", annotation: 'Pressed for proof — good' },
    { role: 'user', content: "That's fair. We commissioned an independent analysis through Nielsen — I can send you the case study. And we back it with a 60-day trial: if you don't see improvement, we take the product back." },
    { role: 'assistant', content: "Hmm. A Nielsen case study... okay, that gets my attention. What about slotting fees?", annotation: 'Opening up — be ready to negotiate slotting' },
    { role: 'user', content: "For your volume tier, we'd cover 50% of the slotting cost for the first seasonal reset, plus a co-op fund for in-store tastings." },
  ],
};`);

// Part 2: Sidebar + Card + CardLabel + FieldSelect + formatTime
parts.push(`function Sidebar({ active }: { active: string }) {
  return (
    <aside style={{ width: 220, background: '#13151F', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 0', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField AI</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Sales Training OS</div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <a key={item.id} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 8, textDecoration: 'none',
            background: active === item.id ? 'rgba(212,134,10,0.15)' : 'transparent',
            color: active === item.id ? '#FAC765' : 'rgba(255,255,255,0.5)',
            fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '12px', background: 'rgba(212,134,10,0.1)', borderRadius: 10, border: '1px solid rgba(212,134,10,0.2)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#D4860A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Upgrade to Pro</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 10 }}>Unlimited simulations, team dashboards & custom personas.</div>
          <button style={{ width: '100%', padding: '8px', background: '#D4860A', border: 'none', borderRadius: 6, color: '#1A1208', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Upgrade</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D4860A, #FAC765)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1A1208' }}>J</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Jordan</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Pro Member</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...props.style }}>{props.children}</div>;
}

function CardLabel(props: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 16 }}>{props.children}</div>;
}

function FieldSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: \`1.5px solid \${focused ? '#D4860A' : '#e5e7eb'}\`, fontSize: 13, color: '#111827', background: '#fff', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', outline: 'none', transition: 'border-color 0.15s' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return \`\${m}:\${sec.toString().padStart(2, '0')}\`;
}`);

// Part 3: ProspectContext
parts.push(`function ProspectContext({ persona }: { persona: Persona }) {
  const titleMap: Record<string, string> = {
    'difficult-customer': 'Business Owner', 'annual-review': 'Your Manager',
    'new-account-pitch': 'Retail Buyer', 'hostile-prospect': 'Procurement Lead',
    'exit-interview': 'HR Representative', 'nh-grocery-buyer': 'Regional Buyer — Grocery',
    'nh-convenience-buyer': 'C-Store Account Manager', 'nh-liquor-store-owner': 'Independent Package Store Owner',
    'nh-bar-owner': 'Bar & Restaurant Owner', 'nh-restaurant-buyer': 'Beer Program Director',
    'nh-district-manager': 'District Sales Manager', 'nh-route-rep': 'Route Sales Rep',
    'nh-lost-account-recovery': 'Win-Back Prospect', 'nh-craft-enthusiast-owner': 'Craft Brewery Owner',
  };
  const title = titleMap[persona.id] || 'Business Contact';
  const objections = [
    'Price is too high vs. current distributor',
    'Switching costs and operational disruption',
    'Unproven velocity in this territory',
    'Already over-extended on shelf/tap space',
  ];
  const winConditions = [
    'Acknowledge the switching risk and offer a trial period',
    'Bring data: velocity, margin lift, brand awareness',
    'Differentiate on service, not just product',
    'Ask for a small commitment, not the whole relationship',
  ];
  return (
    <Card>
      <CardLabel>Scenario Brief</CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: 14, background: '#f9fafb', borderRadius: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: \`linear-gradient(135deg, \${persona.color}33, \${persona.color}66)\`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{persona.emoji}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{persona.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{title}</div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4860A', marginBottom: 5 }}>Deal Objective</div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>Close a new distribution agreement and get product on shelf or on tap within 30 days.</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 8 }}>Likely Objections</div>
        {objections.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: '#374151', lineHeight: 1.45, marginBottom: 5 }}>
            <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>✗</span>{o}
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 8 }}>Win Conditions</div>
        {winConditions.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: '#374151', lineHeight: 1.45, marginBottom: 5 }}>
            <span style={{ color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>✓</span>{w}
          </div>
        ))}
      </div>
    </Card>
  );
}`);

// Part 4: AnalysisView
parts.push(`function AnalysisView({ persona, onReplay, onPractice, onBack }: { persona: Persona; onReplay: () => void; onPractice: () => void; onBack: () => void }) {
  const a = MOCK_ANALYSIS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>Overall Score</div>
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 8px' }}>
            <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(212,134,10,0.1)" strokeWidth={8} />
              <circle cx={50} cy={50} r={42} fill="none" stroke="#D4860A" strokeWidth={8} strokeDasharray={\`\${(a.overall / 100) * 264} \${264}\`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#D4860A', lineHeight: 1 }}>{a.overall}</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>/100</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Good performance</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CardLabel>Skill Breakdown</CardLabel>
          {a.skills.map(s => (
            <div key={s.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{s.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}%</span>
              </div>
              <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: \`\${s.value}%\`, background: s.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardLabel>AI Coach Feedback</CardLabel>
        {a.coachTips.map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 12 }}>
            <span style={{ color: '#D4860A', fontWeight: 700, flexShrink: 0, fontSize: 16, lineHeight: 1.3 }}>→</span>{tip}
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardLabel>Conversation Timeline</CardLabel>
        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {a.transcript.map((entry, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: entry.role === 'user' ? '#D4860A' : '#6b7280' }}>
                  {entry.role === 'user' ? 'You' : persona.name}
                </span>
                {entry.annotation && <span style={{ fontSize: 9, color: '#D4860A', background: 'rgba(212,134,10,0.1)', padding: '2px 7px', borderRadius: 3 }}>{entry.annotation}</span>}
              </div>
              <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.55, padding: '9px 13px', background: entry.role === 'user' ? 'rgba(212,134,10,0.05)' : '#f9fafb', borderRadius: 8, borderLeft: \`3px solid \${entry.role === 'user' ? '#D4860A' : '#e5e7eb'}\` }}>
                {entry.content}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onReplay} style={{ flex: 1, padding: '13px', background: 'transparent', border: '1.5px solid #D4860A', borderRadius: 10, color: '#D4860A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🔁 Replay Tough Moment</button>
        <button onClick={onPractice} style={{ flex: 1, padding: '13px', background: '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>🎤 Practice This Again</button>
        <button onClick={onBack} style={{ flex: 1, padding: '13px', background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 10, color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back to Setup</button>
      </div>
    </div>
  );
}`);

// Part 5: LiveCallPanel
parts.push(`function LiveCallPanel({ messages, status, interimTranscript, callTimer, isMuted, isPaused, onMicClick, onEnd, onMute, onPause, persona }: {
  messages: Message[]; status: Status; interimTranscript: string; callTimer: number; isMuted: boolean; isPaused: boolean;
  onMicClick: () => void; onEnd: () => void; onMute: () => void; onPause: () => void; persona: Persona;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const statusColor: Record<Status, string> = { idle: '#9ca3af', listening: '#ef4444', thinking: '#D4860A', speaking: '#9DC44B' };
  const statusLabel: Record<Status, string> = { idle: 'Ready', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ width: 264, background: '#0E0B05', borderRadius: 28, border: '1.5px solid rgba(212,134,10,0.35)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#261C0B', padding: '14px 18px', borderBottom: '1px solid rgba(212,134,10,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '0.05em', color: '#D4860A' }}>TrainField</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, background: '#9DC44B', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#9DC44B', textTransform: 'uppercase' }}>Connected</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', height: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(245,237,216,0.3)', fontSize: 12 }}>Starting conversation...</div>}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,237,216,0.3)', marginBottom: 3 }}>{m.role === 'user' ? 'You' : persona.name}</div>
                <div style={{ display: 'inline-block', fontSize: 12, lineHeight: 1.5, padding: '8px 12px', maxWidth: '82%', background: m.role === 'user' ? 'rgba(212,134,10,0.22)' : '#3A2A10', color: 'rgba(245,237,216,0.88)', borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px' }}>
                  {m.content}
                </div>
              </div>
            ))}
            {interimTranscript && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,237,216,0.3)', marginBottom: 3 }}>You</div>
                <div style={{ display: 'inline-block', fontSize: 12, lineHeight: 1.5, padding: '8px 12px', background: 'rgba(212,134,10,0.22)', color: 'rgba(245,237,216,0.4)', fontStyle: 'italic', borderRadius: '12px 4px 12px 12px' }}>{interimTranscript}|</div>
              </div>
            )}
            {status === 'thinking' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, background: '#D4860A', borderRadius: '50%', animation: \`bob 1.2s \${i * 0.2}s ease-in-out infinite\` }} />)}
                <span style={{ fontSize: 11, color: 'rgba(245,237,216,0.3)', marginLeft: 4 }}>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(212,134,10,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={onMicClick} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: status === 'listening' ? '#ef4444' : status === 'speaking' ? '#9DC44B' : '#D4860A', transition: 'background 0.15s', boxShadow: status === 'listening' ? '0 0 0 6px rgba(239,68,68,0.2)' : status === 'speaking' ? '0 0 0 6px rgba(157,196,75,0.2)' : 'none' }}>🎤</button>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[status] }} />
                  <span style={{ fontSize: 11, color: 'rgba(245,237,216,0.5)', fontWeight: 500 }}>{statusLabel[status]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ fontSize: 11, color: 'rgba(245,237,216,0.5)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(callTimer)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button onClick={onMute} style={{ padding: '10px 20px', borderRadius: 8, border: \`1.5px solid \${isMuted ? '#ef4444' : '#e5e7eb'}\`, background: isMuted ? 'rgba(239,68,68,0.1)' : '#fff', color: isMuted ? '#ef4444' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>{isMuted ? '🔇' : '🔊'} {isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={onPause} style={{ padding: '10px 20px', borderRadius: 8, border: \`1.5px solid \${isPaused ? '#D4860A' : '#e5e7eb'}\`, background: isPaused ? 'rgba(212,134,10,0.1)' : '#fff', color: isPaused ? '#D4860A' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>{isPaused ? '▶️' : '⏸️'} {isPaused ? 'Resume' : 'Pause'}</button>
        <button onClick={onEnd} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.03em' }}>End Call</button>
      </div>
    </div>
  );
}`);

// Part 6: PracticePage component
parts.push(`export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedPersona, setSelectedPersona] = useState<Persona>(ALL_PERSONAS[0]);
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [dealStage, setDealStage] = useState(DEAL_STAGES[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mockResponses = [
    "Every vendor tells me that. What does your velocity data actually look like?",
    "I've heard this pitch three times this month already.",
    "So what's the commitment? Because I can't flip my shelves on a maybe.",
    "Alright, you got my attention. What do you need from me to get started?",
  ];
  const responseIdx = useRef(0);

  const addMockResponse = useCallback(() => {
    const next = mockResponses[responseIdx.current % mockResponses.length];
    responseIdx.current++;
    setMessages(prev => [...prev, { role: 'assistant', content: next }]);
    setStatus('speaking');
    setTimeout(() => setStatus('idle'), 2200);
  }, []);

  const handleMicClick = useCallback(() => {
    if (status === 'speaking' || status === 'thinking') { setStatus('idle'); return; }
    if (status === 'listening') {
      const userMsg: Message = { role: 'user', content: interimTranscript || '...' };
      setMessages(prev => [...prev, userMsg]);
      setStatus('thinking');
      setInterimTranscript('');
      setTimeout(() => addMockResponse(), 1500);
      return;
    }
    setStatus('listening');
    setInterimTranscript('');
    setTimeout(() => {
      setInterimTranscript("Let's talk about the pricing. I've seen lower.");
      setTimeout(() => {
        const userMsg: Message = { role: 'user', content: "Let's talk about the pricing. I've seen lower." };
        setMessages(prev => [...prev, userMsg]);
        setStatus('thinking');
        setInterimTranscript('');
        setTimeout(() => addMockResponse(), 1500);
      }, 2000);
    }, 1000);
  }, [status, interimTranscript, addMockResponse]);

  const handleLaunch = useCallback(() => {
    setPhase('live');
    setMessages([]);
    setCallTimer(0);
    responseIdx.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
