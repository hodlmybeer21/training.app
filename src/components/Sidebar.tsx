'use client';

const NAV_ITEMS = [
  { emoji: '🏠', label: 'Dashboard', id: 'dashboard', href: '/dashboard' },
  { emoji: '🎤', label: 'Practice', id: 'practice', href: '/dashboard/practice' },
  { emoji: '👥', label: 'Personas', id: 'personas', href: '/dashboard/personas' },
  { emoji: '📊', label: 'Reviews', id: 'reviews', href: '/dashboard/reviews' },
  { emoji: '📈', label: 'Progress', id: 'progress', href: '/dashboard/progress' },
  { emoji: '⚙️', label: 'Settings', id: 'settings', href: '/dashboard/settings' },
];

export default function Sidebar({ active }: { active: string }) {
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
            onClick={() => {
              if (item.href && item.href !== '#') window.location.href = item.href;
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%',
              background: active === item.id ? 'rgba(212,134,10,0.15)' : 'transparent',
              color: active === item.id ? '#FAC765' : 'rgba(255,255,255,0.5)',
              fontSize: 14, fontWeight: 500, textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}