/**
 * Returns `candidate` only if it is an absolute http(s) URL on one of `allowedOrigins`
 * (or a same-site path like "/pricing", resolved against the first origin);
 * otherwise returns `fallback`. Used for Stripe success/cancel URLs.
 */
export function safeRedirectUrl(candidate: unknown, allowedOrigins: (string | null | undefined)[], fallback: string): string {
  if (typeof candidate !== 'string' || !candidate.trim() || candidate.length > 2000) return fallback;
  const origins = new Set<string>();
  for (const o of allowedOrigins) {
    if (!o) continue;
    try { origins.add(new URL(o).origin); } catch { /* skip bad config */ }
  }
  const first = [...origins][0];
  if (!first) return fallback;
  const raw = candidate.trim();
  // "//evil.com" and "/\\evil.com" are protocol-relative tricks, not paths.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  // Only absolute http(s) URLs or root-relative paths; nothing relative or schemeless.
  if (!raw.startsWith('/') && !/^https?:\/\//i.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, first);
  } catch {
    return fallback;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallback;
  if (url.username || url.password) return fallback;
  return origins.has(url.origin) ? url.toString() : fallback;
}
