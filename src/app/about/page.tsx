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
          <p>TrainField AI is a practice room for sales conversations. You talk to an AI buyer who acts like the real thing, then get a scored debrief on what to do better.</p>
        </section>
        <div className="prose">
          <h2>Why we built it</h2>
          <p>In beer distribution, most selling happens face to face: a grocery buyer with twelve feet of cold space, a c-store manager with four cooler doors, a bar owner who switched to a competitor last quarter. Reps usually learn those conversations on live accounts, where a fumbled objection costs a placement. Role-play with a manager helps, but it&apos;s hard to schedule and awkward to repeat.</p>
          <p>TrainField gives reps somewhere to rehearse first, as many times as they want.</p>

          <h2>How it works</h2>
          <ul>
            <li><strong>Pick a scenario.</strong> Buyers cover grocery, convenience, beer and wine shops, bars and restaurants, craft accounts, win-backs and internal conversations with your own manager.</li>
            <li><strong>Talk it through.</strong> Speak into your mic or type. The AI stays in character and pushes back on price, shelf space, support and timing.</li>
            <li><strong>Get scored.</strong> End the call for a 0–100 score across five skills: discovery, objection handling, value articulation, confidence and pacing, and closing, plus specific tips and a drill for next time.</li>
          </ul>

          <h2>What it is and isn&apos;t</h2>
          <p>TrainField is a practice tool. Its scores are AI-generated coaching feedback, which can be wrong, and they aren&apos;t a performance review. The buyers, stores and distributors in the scenarios are fictional and not affiliated with any real company. Market details are meant to feel realistic, but they aren&apos;t a source of truth for pricing, laws or regulations.</p>

          <h2>Who&apos;s behind it</h2>
          <p>TrainField AI is a small, independent project from <a href="https://goodbotai.tech" target="_blank" rel="noopener noreferrer">GoodBot AI</a>, based in New Hampshire. Questions or feedback? Reach us through goodbotai.tech.</p>

          <p style={{ marginTop: 32 }}><a href="/#demo" className="btn-primary" style={{ color: 'var(--dark)' }}>Try the free demo</a></p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
