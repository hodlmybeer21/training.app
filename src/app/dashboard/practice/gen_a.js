const fs = require('fs');
const path = '/root/.openclaw/workspace/training.app/src/app/dashboard/practice/page.tsx';

let c = '';

// ========== PART 1: IMPORTS + CONSTANTS + MOCK DATA ==========
c += `'use client';

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
};
`;

// ========== PART 2: Sidebar + Card + CardLabel ==========
c += `function Sidebar({ active }: { active: string }) {
  return (
    <aside style={{ width: 220, background: '#13151F', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 0', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField AI</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Sales Training OS</div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <a key={item.id} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', background: active === item.id ? 'rgba(212,134,10,0.15)' : 'transparent', color: active === item.id ? '#FAC765' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}>
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
`;

// ========== PART 3: FieldSelect + formatTime ==========
c += `function FieldSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
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
}
`;

fs.writeFileSync('/root/.openclaw/workspace/training.app/src/app/dashboard/practice/_build.js', c);
console.log('Part A written, chars:', c.length);
