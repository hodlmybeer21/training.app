'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

type Tier = {
  id: 'demo' | 'solo' | 'small' | 'team';
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    id: 'demo',
    name: 'Free Demo',
    price: 0,
    period: 'no account',
    description: 'Try a real roleplay right now, straight from the home page.',
    features: [
      'Any of the built-in buyer scenarios',
      'Voice or typed replies',
      'Scored debrief at the end of the call',
      'Nothing is saved',
    ],
    cta: 'Try the free demo',
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 19,
    period: '/ month',
    description: 'For a rep who wants to practice before the calls that matter.',
    features: [
      'Full scenario library across 5 industries',
      'Pick the deal stage and difficulty',
      'Scored debrief after every call',
      'Saved history and transcripts',
      'Progress tracking by skill',
    ],
    cta: 'Start Solo',
    featured: true,
  },
  {
    id: 'small',
    name: 'Small Team',
    price: 79,
    period: '/ month',
    description: 'For a sales manager with a small team.',
    features: [
      'Everything in Solo',
      'Up to 5 seats',
      'Manager view of team sessions and scores',
      'Custom buyer personas for your accounts',
      'Manager-set practice goals',
    ],
    cta: 'Start Small Team',
  },
  {
    id: 'team',
    name: 'Team',
    price: 199,
    period: '/ month',
    description: 'For a full district or sales floor.',
    features: [
      'Everything in Small Team',
      'Up to 15 seats',
      "We set up your team's logins",
    ],
    cta: 'Start Team',
  },
];

const FAQ: [string, string][] = [
  ['How do I get an account?', "Pick a paid plan and check out with Stripe. We create your account and email your login details to the address you used at checkout. Teammates are added by your manager or by us."],
  ['Can I try it first?', "Yes. The free demo on the home page needs no account. You get a full roleplay and a scored debrief. Demo calls aren't saved."],
  ['How do I cancel or change plans?', "Plans are billed monthly. To cancel or switch plans, contact us through goodbotai.tech and we'll take care of it. You won't be charged for the next month after you cancel."],
  ["Who can see my team's data?", "Your own practice history is visible to you, your team's managers, and the account admins. It isn't shared with other teams."],
  ['What do I need to use it?', 'A laptop or phone with a microphone. Voice input works best in Chrome or Edge. In other browsers you can type your replies instead.'],
  ['Are the buyers real people or companies?', 'No. Every buyer, store and distributor in the scenarios is fictional.'],
];

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleCheckout(tier: Tier) {
    if (tier.id === 'demo') {
      router.push('/#demo');
      return;
    }

    if (!user) {
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
        setMessage('Checkout is not available right now. Please contact us through goodbotai.tech.');
      }
    } catch (e: any) {
      setMessage(e.message);
    }

    setLoadingTier(null);
  }

  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <section className="page-hero">
          <div className="section-label">Pricing</div>
          <h1>Practice is free to try.<br /><em>Progress is a plan.</em></h1>
          <p>Run the demo with no account. When you want every call scored, saved and tracked, or want to coach a team, pick a monthly plan. Cancel any time.</p>
        </section>

        {message && <div className="notice" role="alert">{message}</div>}

        <section className="tiers">
          {TIERS.map((tier) => (
            <div key={tier.id} className={`tier ${tier.featured ? 'featured' : ''}`}>
              {tier.featured && <div className="tier-badge">Most popular</div>}
              <div className="tier-name">{tier.name}</div>
              <div className="tier-price"><b>${tier.price}</b><span>{tier.period}</span></div>
              <div className="tier-desc">{tier.description}</div>
              <ul>
                {tier.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button
                onClick={() => handleCheckout(tier)}
                disabled={loadingTier === tier.id}
                className={tier.featured ? 'btn-primary' : 'btn-ghost'}
                style={{ opacity: loadingTier === tier.id ? 0.6 : 1 }}
              >
                {loadingTier === tier.id ? 'Redirecting…' : tier.cta}
              </button>
            </div>
          ))}
        </section>
        <p style={{ padding: '0 70px', fontSize: 12, color: 'rgba(245,237,216,0.4)' }} className="pricing-note">
          Prices in USD, billed monthly through Stripe. {user ? <a href="/dashboard" style={{ color: 'var(--amber-light)' }}>Go to your dashboard →</a> : null}
        </p>

        <section className="faq">
          <h2>Common questions</h2>
          {FAQ.map(([q, a]) => (
            <div key={q} className="faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
