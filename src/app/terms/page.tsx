import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The simple terms for using TrainField AI.',
};

export default function TermsPage() {
  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <section className="page-hero">
          <div className="section-label">Terms</div>
          <h1>Terms of <em>use.</em></h1>
          <p>The short version: it&apos;s a practice tool. Use it for practice, be decent, and pay for the plan you pick.</p>
        </section>
        <div className="prose">
          <p className="updated">Last updated October 24, 2026</p>

          <h2>1. What TrainField is</h2>
          <p>TrainField AI, a GoodBot AI project, lets you rehearse sales conversations with AI-generated buyer personas and get AI-generated feedback. By using the site, you agree to these terms.</p>

          <h2>2. It&apos;s practice, not advice</h2>
          <p>Personas, stores, distributors and market details are fictional or simplified. AI replies and scores can be wrong, inconsistent or incomplete. Don&apos;t rely on them for legal, compliance, pricing or employment decisions, and don&apos;t treat a score as a formal performance evaluation.</p>

          <h2>3. Accounts</h2>
          <p>Accounts are created when you buy a plan or when your team adds you. Keep your login to yourself, and let us know if you think someone else has used it. Your organization&apos;s managers and admins can see the practice sessions saved under your team.</p>

          <h2>4. Acceptable use</h2>
          <ul>
            <li>Don&apos;t use the service to make harmful, harassing or illegal content.</li>
            <li>Don&apos;t try to get around usage limits, scrape the service, or use it as a general-purpose AI proxy.</li>
            <li>Don&apos;t enter confidential information you&apos;re not allowed to share.</li>
          </ul>
          <p>We may limit or suspend access that breaks these rules or puts the service at risk.</p>

          <h2>5. Plans and billing</h2>
          <p>Paid plans are billed monthly in USD through Stripe until you cancel. To cancel or change plans, contact us through <a href="https://goodbotai.tech" target="_blank" rel="noopener noreferrer">goodbotai.tech</a>. Cancellation stops future charges. We don&apos;t pro-rate partial months unless the law requires it. If we change a plan&apos;s price, we&apos;ll tell you before it applies to you.</p>

          <h2>6. The service</h2>
          <p>We work to keep TrainField running well, but it&apos;s provided &ldquo;as is,&rdquo; without guarantees of uptime or accuracy. We may change or retire features. To the extent the law allows, our total liability is limited to what you paid us in the past three months.</p>

          <h2>7. Your content</h2>
          <p>You own what you say and type. You let us process it to run the service, as described in our <a href="/privacy">Privacy</a> page.</p>

          <h2>8. Contact</h2>
          <p>Questions? Reach us through <a href="https://goodbotai.tech" target="_blank" rel="noopener noreferrer">goodbotai.tech</a>.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
