import Logo from './Logo';

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="site-nav" aria-label="Main">
        <a href="/#demo" className="site-nav-hide-sm">Try the demo</a>
        <a href="/pricing">Pricing</a>
        <a href="/about">About</a>
        <a href="/login" className="site-nav-signin">Sign in</a>
      </nav>
    </header>
  );
}
