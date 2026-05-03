'use client';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_initial: string | null;
  role: string | null;
  team_id: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarColor, setAvatarColor] = useState('#D4860A');
  const [avatarText, setAvatarText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'team'>('profile');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) setUsername(data.user.email.split('@')[0]);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setProfile(d.profile);
          setDisplayName(d.profile.display_name || '');
          setAvatarText(d.profile.avatar_initial || '');
        }
      })
      .catch(() => {});
  }, [user]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': profile.id },
        body: JSON.stringify({
          display_name: displayName.trim() || displayName,
          avatar_initial: avatarText.trim().substring(0, 1).toUpperCase(),
          bio: bio.trim(),
        }),
      });
      if (res.ok) {
        setProfile({ ...profile, display_name: displayName, avatar_initial: avatarText.substring(0, 1) });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const avatarColors = [
    '#D4860A', '#9DC44B', '#3B82F6', '#EF4444',
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
  ];

  const initials = displayName.trim() ? displayName.trim().substring(0, 2).toUpperCase() : '?';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .main-content { margin-left: 0 !important; }
          .desktop-only { display: none !important; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
        }
        input, textarea { color: #1A1208 !important; }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: 220, transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease' }}>
        <Sidebar active="settings" />
      </div>
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

      <div style={{ flex: 1 }} className="main-content">
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setMobileMenuOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, display: 'none' }}>☰</button>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>⚙️ Settings</div>
        </header>

        <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4 }}>
            {(['profile', 'account', 'team'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: activeTab === tab ? '#D4860A' : 'transparent',
                color: activeTab === tab ? '#fff' : '#6b7280',
              }}>
                {tab === 'profile' ? '👤 Profile' : tab === 'account' ? '🔐 Account' : '🏢 Team'}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Avatar section */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Avatar</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', background: avatarColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {initials || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Avatar Color</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {avatarColors.map(c => (
                          <button key={c} onClick={() => setAvatarColor(c)} style={{
                            width: 28, height: 28, borderRadius: '50%', background: c, border: avatarColor === c ? '3px solid #111' : '2px solid transparent',
                            cursor: 'pointer', outline: avatarColor === c ? '2px solid #fff' : 'none',
                          }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', transition: 'border-color 0.15s', background: '#fff' }}
                        onFocus={e => e.target.style.borderColor = '#D4860A'}
                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Bio</div>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell your team a bit about yourself..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.5, background: '#fff' }}
                  onFocus={e => e.target.style.borderColor = '#D4860A'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{bio.length}/280 characters</p>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{ padding: '13px 24px', background: saving ? '#D4860A88' : '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
              >
                {saved ? '✅ Saved!' : saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Account Info</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</label>
                    <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{user?.email || '—'}</div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Email is managed through your auth provider and cannot be changed here.</p>
                  </div>
                  <div style={{ height: 1, background: '#f3f4f6' }} />
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Role</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, color: '#111827', fontWeight: 600, textTransform: 'capitalize' }}>{profile?.role || 'rep'}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 99 }}>read only</span>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#f3f4f6' }} />
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Account ID</label>
                    <div style={{ fontSize: 13, color: '#6b7280', wordBreak: 'break-all', fontFamily: 'monospace' }}>{user?.id || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Team Info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team ID</label>
                  <div style={{ fontSize: 13, color: '#6b7280', wordBreak: 'break-all', fontFamily: 'monospace' }}>{profile?.team_id || 'Not assigned'}</div>
                </div>
                <div style={{ height: 1, background: '#f3f4f6' }} />
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team</label>
                  <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>Bellavance Beverage Co.</div>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Team management is handled by your administrator. Contact them to update team settings.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}