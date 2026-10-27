import { ImageResponse } from 'next/og';

// Social preview card (also used for Twitter/X via twitter-image below).
export const alt = 'TrainField AI: Train before you pitch. Voice roleplay for beer distribution sales reps.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#1A1208', padding: '64px 72px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#D4860A" /><rect x="12" y="6" width="8" height="13" rx="4" fill="#1A1208" /><path d="M9 15a7 7 0 0 0 14 0" fill="none" stroke="#1A1208" strokeWidth="2.4" strokeLinecap="round" /><path d="M16 22v4" stroke="#1A1208" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <div style={{ color: '#F5EDD8', fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>TRAINFIELD AI</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#F5EDD8', fontSize: 92, fontWeight: 800, lineHeight: 1.0 }}>Train before</div>
          <div style={{ color: '#D4860A', fontSize: 92, fontWeight: 800, lineHeight: 1.0 }}>you pitch.</div>
          <div style={{ color: 'rgba(245,237,216,0.8)', fontSize: 32, marginTop: 28, maxWidth: 940 }}>Pitch an AI buyer out loud, then get a scored debrief. Built for beer distribution sales reps.</div>
        </div>
        <div style={{ display: 'flex', color: '#FAC765', fontSize: 26 }}>Free demo, no account needed · training.goodbotai.tech</div>
      </div>
    ),
    size,
  );
}
