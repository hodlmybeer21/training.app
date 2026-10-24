// Admin emails come from the ADMIN_EMAILS env var (comma-separated, server-side only).
// There is deliberately no hardcoded fallback: if ADMIN_EMAILS is unset, only
// profiles with role 'admin' are treated as admins.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
