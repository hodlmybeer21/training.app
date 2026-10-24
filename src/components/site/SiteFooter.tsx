import { LogoMark } from './Logo';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <div className="site-footer-logo"><LogoMark size={22} /> TrainField AI</div>
        <p>Voice roleplay practice for beer distribution sales reps. Personas are fictional and not affiliated with any distributor, retailer or brewery.</p>
      </div>
      <nav className="site-footer-links" aria-label="Footer">
        <a href="/#demo">Free demo</a>
        <a href="/pricing">Pricing</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/login">Sign in</a>
      </nav>
      <div className="site-footer-copy">© {new Date().getFullYear()} TrainField AI · A GoodBot AI project</div>
    </footer>
  );
}
