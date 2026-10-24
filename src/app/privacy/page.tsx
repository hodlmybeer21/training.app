import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What TrainField AI collects, where it goes, and how to delete it.',
};

export default function PrivacyPage() {
  return (
    <div className="page-wrap">
      <SiteHeader />
      <main className="page-main">
        <section className="page-hero">
          <div className="section-label">Privacy</div>
          <h1>Privacy, <em>in plain English.</em></h1>
          <p>Here&apos;s exactly what happens to what you say and type in TrainField AI.</p>
        </section>
        <div className="prose">
          <p className="updated">Last updated October 24, 2026</p>

          <h2>The free demo (no account)</h2>
          <ul>
            <li><strong>Your voice.</strong> Speech-to-text runs through your browser&apos;s built-in speech recognition. We never receive audio. In Chrome, the browser sends your audio to Google to turn it into text, under Google&apos;s terms. Other browsers handle this their own way.</li>
            <li><strong>Your words.</strong> The text of the conversation is sent through our server to our AI provider, <strong>Groq</strong>, to generate the buyer&apos;s replies and to score the call.</li>
            <li><strong>The buyer&apos;s voice.</strong> Replies are read aloud by your browser&apos;s own text-to-speech.</li>
            <li><strong>Nothing is saved.</strong> We don&apos;t store demo transcripts or scores. To limit abuse, our server briefly counts requests per IP address in memory; these counts aren&apos;t written to a database.</li>
          </ul>

          <h2>If you have an account</h2>
          <ul>
            <li><strong>Account details:</strong> your email, name, role, and team are stored with our database and login provider, <strong>Supabase</strong>.</li>
            <li><strong>Practice sessions:</strong> transcripts, scores, feedback, and session length are saved in Supabase so you can review your progress. Your team&apos;s managers and the account admins can see them.</li>
            <li><strong>Team content:</strong> goals and custom personas your managers create are stored in Supabase.</li>
            <li><strong>Payments:</strong> checkout is handled by <strong>Stripe</strong>. We never see your full card number. We receive your email and subscription status.</li>
            <li><strong>Welcome email:</strong> when you buy a plan, we use <strong>AgentMail</strong> to email your login details.</li>
          </ul>

          <h2>Everyone</h2>
          <ul>
            <li><strong>Hosting:</strong> the site runs on <strong>Vercel</strong>, which keeps standard server logs, including IP address, browser and pages requested.</li>
            <li><strong>Fonts:</strong> fonts load from Google Fonts, so your browser contacts Google when pages load.</li>
            <li><strong>Cookies:</strong> we only use the login cookies needed to keep you signed in. We don&apos;t use advertising cookies or analytics trackers.</li>
            <li><strong>No selling:</strong> we don&apos;t sell your data or use it for advertising.</li>
          </ul>

          <h2>A note on what you say</h2>
          <p>Practice conversations are just that, practice. Please don&apos;t share real customer secrets, personal information about others, or anything confidential in a roleplay.</p>

          <h2>Deleting your data</h2>
          <p>Contact us through <a href="https://goodbotai.tech" target="_blank" rel="noopener noreferrer">goodbotai.tech</a> to see, correct or delete your account and saved sessions. We&apos;ll confirm when it&apos;s done.</p>

          <h2>Changes</h2>
          <p>If this changes, we&apos;ll update this page and the date at the top.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
