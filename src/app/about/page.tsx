import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why TrainField AI exists and how it works.',
};

export default function AboutPage() {
  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <section className="page-hero">
          <div className="section-label">About</div>
          <h1>Reps get better by <em>talking.</em></h1>
          <p>TrainField AI is a practice room for sales and team conversations. You talk to an AI buyer, client or employee who acts like the real thing, then get a scored debrief on what to do better.</p>
        </section>
        <div className="prose">
          <h2>Why we built it</h2>
          <p>In beer distribution, most selling happens face to face: a grocery buyer with twelve feet of cold space, a c-store manager with four cooler doors, a bar owner who switched to a competitor last quarter. Reps usually learn those conversations on live accounts, where a fumbled objection costs a placement. Role-play with a manager helps, but it&apos;s hard to schedule and awkward to repeat.</p>
          <p>TrainField gives reps somewhere to rehearse first, as many times as they want.</p>
          <p>The same problem shows up well beyond beer, so TrainField now has scenarios for real estate agents (listing appointments, expired and FSBO calls, buyer consultations), insurance agents (renewals, claim disputes, benefits questions), retail store teams, and managers and HR (reviews, raise requests, conflict and exit interviews). Each industry gets its own coaching rules: tied-house rules for beer, fair housing for real estate, no promised coverage or claim outcomes for insurance, and policy-safe language for managers.</p>

          <h2>How it works</h2>
          <ul>
            <li><strong>Pick a scenario.</strong> Beer buyers (grocery, convenience, beer and wine shops, bars and restaurants, craft accounts, win-backs), real estate and insurance clients, retail customers, and conversations with your own team.</li>
            <li><strong>Talk it through.</strong> Speak into your mic or type. The AI stays in character and pushes back on price, trust, support and timing.</li>
            <li><strong>Get scored.</strong> End the call for a 0–100 score across five skills, plus specific tips and a drill for next time. Sales calls are scored on discovery, objection handling, value, confidence and pacing, and closing; manager and HR conversations on listening, empathy, clarity, policy-safe language, and next steps.</li>
          </ul>

          <h2>What it is and isn&apos;t</h2>
          <p>TrainField is a practice tool. Its scores are AI-generated coaching feedback, which can be wrong, and they aren&apos;t a performance review. The people, stores, brokerages, insurers and distributors in the scenarios are fictional and not affiliated with any real company. Market details are meant to feel realistic, but they aren&apos;t a source of truth for pricing, laws or regulations.</p>

          <h2>Who&apos;s behind it</h2>
          <p>TrainField AI is a small, independent project from <a href="https://goodbotai.tech" target="_blank" rel="noopener noreferrer">GoodBot AI</a>, based in New Hampshire. Questions or feedback? Reach us through goodbotai.tech.</p>

          <p style={{ marginTop: 32 }}><a href="/#demo" className="btn-primary" style={{ color: 'var(--dark)' }}>Try the free demo</a></p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
