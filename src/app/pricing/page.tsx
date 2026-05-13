'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    color: '#9ca3af',
    description: 'Try it out, no credit card needed',
    features: [
      '3 practice sessions per month',
      'All 5 category verticals',
      'Basic skill scoring',
      'Session history',
    ],
    cta: 'Get Started Free',
    stripePriceId: null,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 19,
    period: 'month',
    color: '#3b82f6',
    description: 'For individual sales reps who want unlimited practice',
    features: [
      'Unlimited practice sessions',
      'All 5 category verticals',
      'Full AI analysis & scoring',
      'Session history & transcripts',
      'Downloadable session recordings',
    ],
    cta: 'Start Solo',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID || null,
  },
  {
    id: 'small',
    name: 'Small Team',
    price: 79,
    period: 'month',
    color: '#8b5cf6',
    description: 'For teams of up to 5 growing their sales skills',
    features: [
      'Everything in Solo',
      'Up to 5 team members',
      'Team dashboard & reports',
      'Custom persona creation',
      'Invite team via admin panel',
    ],
    cta: 'Start Small Team',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SMALL_TEAM_PRICE_ID || null,
  },
  {
    id: 'team',
    name: 'Team',
    price: 199,
    period: 'month',
    color: '#D4860A',
    description: 'For teams of up to 15 serious about sales performance',
    features: [
      'Everything in Small Team',
      'Up to 15 team members',
      'Manager-led goals & tracking',
      'Priority support',
      'Quarterly strategy call',
    ],
    cta: 'Start Team',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || null,
  },
];

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleCheckout(tier: typeof TIERS[0]) {
    if (tier.id === 'free') {
      if (!user) {
        router.push('/login');
        return;
      }
      // Already free — just redirect to dashboard
      router.push('/dashboard');
      return;
    }

    if (!user && tier.id !== 'free') {
      // Allow guest checkout for paid tiers — Stripe collects email on its checkout page
      setLoadingTier(tier.id);
      try {
        const baseUrl = window.location.origin;
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: tier.id,
            successUrl: `${baseUrl}/dashboard?upgrade=success`,
            cancelUrl: `${baseUrl}/pricing`,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setMessage(data.error || 'Checkout not available.');
          setLoadingTier(null);
          return;
        }
      } catch (e: any) {
        setMessage(e.message);
        setLoadingTier(null);
        return;
      }
      return;
    }

    setLoadingTier(tier.id);
    setMessage('');

    try {
      const baseUrl = window.location.origin;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: tier.id, // 'solo' | 'small' | 'team'
          email: user.email,
          successUrl: `${baseUrl}/dashboard?upgrade=success`,
          cancelUrl: `${baseUrl}/pricing`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage('Checkout not configured yet. Contact admin.');
      }
    } catch (e: any) {
      setMessage(e.message);
    }

    setLoadingTier(null);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header style={{ background: '#1A1208', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField AI</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sales Training OS</div>
        </div>
        <button
          onClick={() => router.push(user ? '/dashboard' : '/login')}
          style={{ background: '#D4860A', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {user ? 'Go to Dashboard' : 'Sign In'}
        </button>
      </header>

      {/* Hero */}
      <div style={{ background: '#1A1208', padding: '40px 24px 60px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Simple, honest pricing</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto' }}>
          Start free. No credit card needed. Upgrade when you're ready to go all in.
        </div>
        {message && (
          <div style={{ marginTop: 16, background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 16px', color: '#ef4444', fontSize: 13, display: 'inline-block' }}>
            {message}
          </div>
        )}
      </div>

      {/* Tiers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, maxWidth: 960, margin: '-40px auto 40px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {TIERS.map((tier) => (
          <div key={tier.id} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 0, border: tier.id === 'solo' ? '2px solid #3b82f6' : '1.5px solid #e5e7eb' }}>
            {tier.id === 'solo' && (
              <div style={{ background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, display: 'inline-block', alignSelf: 'flex-start', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Most Popular
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{tier.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: tier.price === 0 ? '#9ca3af' : tier.color }}>${tier.price}</span>
              {tier.price > 0 && <span style={{ fontSize: 13, color: '#9ca3af' }}>/{tier.period}</span>}
              {tier.price === 0 && <span style={{ fontSize: 13, color: '#9ca3af' }}>free</span>}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>{tier.description}</div>
            <div style={{ flex: 1 }}>
              {tier.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#4ade80', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleCheckout(tier)}
              disabled={loadingTier === tier.id}
              style={{
                width: '100%', marginTop: 20, padding: '12px',
                background: loadingTier === tier.id ? '#e5e7eb' : tier.id === 'free' ? '#1A1208' : tier.color,
                border: tier.id === 'free' ? '1.5px solid #1A1208' : 'none',
                borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: loadingTier === tier.id ? 'not-allowed' : 'pointer',
                opacity: loadingTier === tier.id ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {loadingTier === tier.id ? 'Redirecting...' : tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 600, margin: '0 auto 60px', padding: '0 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 24, textAlign: 'center' }}>Common questions</div>
        {[
          ['Can I change plans?', 'Yes. Upgrade or downgrade at any time. Your data stays with you.'],
          ['How does the free tier work?', 'Free users get 3 practice sessions per month, no credit card needed. After 3, upgrade to continue.'],
          ['Who can see my team\s data?', 'Only your team\s managers and admins. Your data is private to your organization.'],
          ['How do I add team members?', 'As an admin, use the Admin Console to invite managers. Managers invite their own reps.'],
        ].map(([q, a]) => (
          <div key={String(q)} style={{ marginBottom: 20, background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{q}</div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
