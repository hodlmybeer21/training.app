'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const NAV_ITEMS_ALL = [
  { emoji: '🏠', label: 'Dashboard', id: 'dashboard', href: '/dashboard' },
  { emoji: '🎤', label: 'Practice', id: 'practice', href: '/dashboard/practice' },
  { emoji: '👥', label: 'Personas', id: 'personas', href: '/dashboard/personas' },
  { emoji: '📊', label: 'Reviews', id: 'reviews', href: '/dashboard/reviews' },
  { emoji: '📈', label: 'Progress', id: 'progress', href: '/dashboard/progress' },
  { emoji: '⚙️', label: 'Settings', id: 'settings', href: '/dashboard/settings' },
  { emoji: '🎯', label: 'My Team', id: 'manager', href: '/dashboard/manager', roles: ['manager', 'admin'] },
  { emoji: '🛡️', label: 'Admin', id: 'admin', href: '/dashboard/admin', emails: ['tyler.dubuque@gmail.com'] },
];

function InlineSidebar({ active }: { active: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
    // We need role too — fetch profile
    supabase.fetch('/api/profile', { headers: {} }).then(r => r.json()).then(d => {
      if (d.profile?.role) setRole(d.profile.role);
    }).catch(() => {});
  }, []);

  // Fetch profile for role
  useEffect(() => {
    if (!email) return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d.profile?.role) setRole(d.profile.role); })
      .catch(() => {});
  }, [email]);

  const visibleItems = NAV_ITEMS_ALL.filter(item => {
    if (item.roles && !item.roles.includes(role || '')) return false;
    if (item.emails && !item.emails.includes(email || '')) return false;
    return true;
  });

  return (
    <aside style={{ width: 220, background: '#13151F', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 0', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField AI</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Sales Training OS</div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleItems.map(item => (
          <a
            key={item.id}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, width: '100%',
              background: active === item.id ? 'rgba(212,134,10,0.15)' : 'transparent',
              color: active === item.id ? '#FAC765' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default function InlineSidebarComp({ active }: { active: string }) {
  return <InlineSidebar active={active} />;
}
