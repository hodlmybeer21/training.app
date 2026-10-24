export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#D4860A" />
      <rect x="12" y="6" width="8" height="13" rx="4" fill="#1A1208" />
      <path d="M8.5 15.5a7.5 7.5 0 0 0 15 0" stroke="#1A1208" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M16 23v3.5M11.5 26.5h9" stroke="#1A1208" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <a href="/" className="site-logo" aria-label="TrainField AI home">
      <LogoMark />
      <span>TrainField <em>AI</em></span>
    </a>
  );
}
