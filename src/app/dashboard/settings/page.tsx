'use client';
import { useState, useEffect, useRef } from 'react';
import DashboardNav from '@/components/DashboardNav';
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
  const [teamName, setTeamName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState(false);
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
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => {
        if (d.profile) {
          setProfile(d.profile);
          setTeamName(d.teamName ?? null);
          setDisplayName(d.profile.display_name || '');
          setAvatarText(d.profile.avatar_initial || '');
          setBio(d.profile.bio || '');
        }
        try {
          const storedColor = window.localStorage.getItem('tf-avatar-color');
          if (storedColor) setAvatarColor(storedColor);
        } catch { /* storage unavailable */ }
      })
      .catch(() => setLoadError(true));
  }, [user]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveError('');
    try {
      try { window.localStorage.setItem('tf-avatar-color', avatarColor); } catch { /* storage unavailable */ }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      } else {
        setSaveError('Your changes were not saved. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setSaveError('Your changes were not saved. Check your connection and try again.');
    }
    setSaving(false);
  };

  const COLOR_NAMES: Record<string, string> = {
    '#D4860A': 'amber', '#9DC44B': 'hop green', '#3B82F6': 'blue', '#EF4444': 'red',
    '#8B5CF6': 'purple', '#EC4899': 'pink', '#10B981': 'emerald', '#F59E0B': 'gold',
  };
  const avatarColors = [
    '#D4860A', '#9DC44B', '#3B82F6', '#EF4444',
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
  ];

  const initials = displayName.trim() ? displayName.trim().substring(0, 2).toUpperCase() : '?';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        .main-content { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; flex: none !important; overflow-x: hidden !important; }
        @media (max-width: 768px) {
          .settings-content { padding: 16px 12px !important; max-width: 100% !important; }
        }
        input, textarea { color: #1A1208 !important; }
      `}</style>

      <div style={{ flex: 1, overflow: 'auto', marginLeft: 0 }} className="main-content">
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <DashboardNav active="settings" />
          <h1 className="dash-page-title" style={{ fontSize: 20 }}><span aria-hidden="true">⚙️ </span>Settings</h1>
        </header>

        <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }} className="settings-content">
          {loadError && (
            <div role="alert" className="dash-state dash-state-error" style={{ marginBottom: 20, padding: '14px 18px', textAlign: 'left' }}>
              We couldn&apos;t load your profile.{' '}
              <button type="button" className="dash-retry" onClick={() => window.location.reload()}>Try again</button>
            </div>
          )}
          {/* Tab bar */}
          <div role="group" aria-label="Settings sections" style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4 }}>
            {(['profile', 'account', 'team'] as const).map(tab => (
              <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: activeTab === tab ? '#D4860A' : 'transparent',
                color: activeTab === tab ? '#fff' : '#6b7280',
              }}>
                <span aria-hidden="true">{tab === 'profile' ? '👤 ' : tab === 'account' ? '🔐 ' : '🏢 '}</span>{tab === 'profile' ? 'Profile' : tab === 'account' ? 'Account' : 'Team'}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Avatar section */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Avatar</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div aria-hidden="true" style={{
                    width: 72, height: 72, borderRadius: '50%', background: avatarColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {initials || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 10 }}>
                      <div id="avatar-color-label" style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Avatar color <span style={{ fontWeight: 400, color: '#6b7280' }}>(saved on this device)</span></div>
                      <div role="group" aria-labelledby="avatar-color-label" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {avatarColors.map(c => (
                          <button key={c} type="button" aria-label={`Avatar color ${COLOR_NAMES[c] || c}`} aria-pressed={avatarColor === c} onClick={() => setAvatarColor(c)} style={{
                            width: 28, height: 28, borderRadius: '50%', background: c, border: avatarColor === c ? '3px solid #111' : '2px solid transparent',
                            cursor: 'pointer',
                          }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="display-name" style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Display name</label>
                      <input
                        id="display-name"
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        style={{ width: '100%', minWidth: 0, padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, transition: 'border-color 0.15s', background: '#fff', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = '#D4860A'}
                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
                <label htmlFor="bio" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Bio</label>
                <textarea
                  id="bio"
                  maxLength={280}
                  aria-describedby="bio-count"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell your team a bit about yourself…"
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, resize: 'vertical', lineHeight: 1.5, background: '#fff', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#D4860A'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <p id="bio-count" style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>{bio.length}/280 characters</p>
              </div>

              {saveError && <div role="alert" className="dash-state dash-state-error" style={{ padding: '12px 16px', textAlign: 'left' }}>{saveError}</div>}
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                style={{ padding: '13px 24px', background: saving ? '#D4860A88' : '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
              >
                <span role="status">{saved ? '✅ Saved' : saving ? 'Saving…' : 'Save changes'}</span>
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</div>
                    <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{user?.email || '—'}</div>
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Your sign-in email can&apos;t be changed here.</p>
                  </div>
                  <div style={{ height: 1, background: '#f3f4f6' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Role</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, color: '#111827', fontWeight: 600, textTransform: 'capitalize' }}>{profile?.role || 'rep'}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 99 }}>read only</span>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#f3f4f6' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Account ID</div>
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team ID</div>
                  <div style={{ fontSize: 13, color: '#6b7280', wordBreak: 'break-all', fontFamily: 'monospace' }}>{profile?.team_id || 'Not assigned'}</div>
                </div>
                <div style={{ height: 1, background: '#f3f4f6' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team</div>
                  <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{teamName || 'Not assigned'}</div>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Team management is handled by your administrator. Contact them to update team settings.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}