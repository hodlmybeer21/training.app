'use client';

import { useState, useEffect } from 'react';
import { PERSONAS } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

const ALL_PERSONAS = [...PERSONAS, ...NH_PERSONAS];

type PersonaCardProps = {
  persona: typeof ALL_PERSONAS[0];
  expanded: boolean;
  onToggle: () => void;
};

function PersonaCard({ persona, expanded, onToggle }: PersonaCardProps) {
  const brief = {
    'difficult-customer': { dealObj: 'Overcome skepticism with specific proof and ROI data', win: 'Earning credibility through case studies and a risk-reversal offer' },
    'annual-review': { dealObj: 'Navigate mixed feedback, own misses, present a credible 90-day plan', win: 'Leaving with a concrete development plan both parties agree on' },
    'new-account-pitch': { dealObj: 'Break an 8-year incumbent relationship with data, not charm', win: 'Securing a 90-day trial with performance targets both sides agree on' },
    'hostile-prospect': { dealObj: 'Stay composed under pressure, find the real underlying objection', win: 'Securing a follow-up without conceding on price' },
    'exit-interview': { dealObj: 'Give honest talk on culture without corporate deflection', win: 'Building trust with genuine answers over company line' },
    'nh-grocery-buyer': { dealObj: 'Secure 3 cold-box endcap positions for summer craft lineup', win: '90-day trial with velocity targets, signed deal memo by end of call' },
    'nh-convenience-buyer': { dealObj: 'Win cooler door space at a regional c-store chain', win: 'Confirm delivery windows + promo/staff training package' },
    'nh-liquor-store-owner': { dealObj: 'Earn shelf space at an 18-year craft-savvy independent', win: 'Name real moving accounts, commit to tastings and rep visits' },
    'nh-bar-owner': { dealObj: 'Win tap handles + pour pricing with slow-Tuesday support', win: 'Tap exclusivity in territory + events/tap takeover plan' },
    'nh-restaurant-buyer': { dealObj: 'Position as premium craft addition for upscale dining menu', win: 'POS materials, staff training, and tap exclusivity commitment' },
    'nh-district-manager': { dealObj: 'Present premium mix protection and fill rate recovery plan', win: 'Agreed action plan with milestones and honest field reporting commitment' },
    'nh-route-rep': { dealObj: 'Practice routine check-in — order building and account management', win: 'Building the order, documenting competitor intel, confirming next visit' },
    'nh-lost-account-recovery': { dealObj: 'Recover a lost account in 60 seconds with a competing offer on the table', win: 'Earned in-person meeting with a concrete counter-proposal' },
    'nh-craft-enthusiast-owner': { dealObj: 'Earn distribution trust with territory protection and freshness guarantees', win: 'Written territory protection + no bad-account placement promise' },
  };

  const brief_data = (brief as any)[persona.id] || { dealObj: 'Move the deal forward', win: 'Secure next steps' };

  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s',
      border: expanded ? `2px solid ${persona.color}` : '2px solid transparent',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '16px 20px', background: 'none', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: `${persona.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {persona.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{persona.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{persona.description}</div>
        </div>
        <div style={{ fontSize: 18, color: '#9ca3af', flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</div>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: persona.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Your Goal</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{brief_data.dealObj}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: persona.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>What Wins This Call</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{brief_data.win}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: persona.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Opening Line</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, fontStyle: 'italic' }}>"{persona.openingLine.slice(0, 120)}{persona.openingLine.length > 120 ? '...' : ''}"</div>
            </div>
            <a href="/dashboard/practice" style={{
              display: 'block', textAlign: 'center', marginTop: 8, padding: '10px',
              background: persona.color, borderRadius: 8, color: '#fff',
              fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em',
            }}>
              🎤 Practice This Scenario →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PersonasPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_initial: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('personas');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); setNameInput(d.profile?.display_name || ''); })
      .catch(() => {});
  }, []);

  const categories = [
    { label: 'General Training', color: '#D4860A', personas: PERSONAS },
    { label: 'NH Off-Premise', color: '#3b82f6', personas: NH_PERSONAS.filter(p => ['nh-grocery-buyer', 'nh-convenience-buyer', 'nh-liquor-store-owner'].includes(p.id)) },
    { label: 'NH On-Premise', color: '#10b981', personas: NH_PERSONAS.filter(p => ['nh-bar-owner', 'nh-restaurant-buyer'].includes(p.id)) },
    { label: 'NH Internal & Competitive', color: '#ef4444', personas: NH_PERSONAS.filter(p => ['nh-district-manager', 'nh-route-rep', 'nh-lost-account-recovery', 'nh-craft-enthusiast-owner'].includes(p.id)) },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Mobile sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: 220,
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}>
        <Sidebar active="personas" />
      </div>
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      <div style={{ flex: 1, overflow: 'auto' }} className="main-content">
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setMobileMenuOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, display: 'none' }}>☰</button>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>👥 Persona Library</div>
        </header>

        <div style={{ padding: 28 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>AI Training Personas</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>14 realistic personas — each with a unique personality, objections, and goal. Tap any persona to see the scenario brief and start practicing.</p>
          </div>

          {categories.map(cat => (
            <div key={cat.label} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.label}</h2>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>({cat.personas.length})</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {cat.personas.map(persona => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    expanded={expanded === persona.id}
                    onToggle={() => setExpanded(expanded === persona.id ? null : persona.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .hamburger-btn { display: block !important; }
        }
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .main-content { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
