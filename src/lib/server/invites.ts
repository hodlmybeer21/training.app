import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Link that lets a new user set their own password. It points at our
 * /set-password page with Supabase's one-time token hash, so it does not depend
 * on Supabase's redirect URL allow-list. No password is ever created here.
 */
export function buildSetPasswordLink(hashedToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://training.goodbotai.tech';
  return `${baseUrl}/set-password?token_hash=${encodeURIComponent(hashedToken)}&type=invite`;
}

/**
 * Creates the auth user through Supabase's invite flow and returns the
 * set-password link. Throws with Supabase's message on failure
 * (for example when the email is already registered).
 */
export async function createInvitedUser(
  sb: SupabaseClient,
  email: string,
  appMetadata: Record<string, unknown> = {},
): Promise<{ user: User; link: string }> {
  const { data, error } = await sb.auth.admin.generateLink({ type: 'invite', email });
  if (error || !data?.user || !data.properties?.hashed_token) {
    throw new Error(error?.message || 'Could not create the invite');
  }
  if (Object.keys(appMetadata).length > 0) {
    const { error: metaError } = await sb.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...(data.user.app_metadata || {}), ...appMetadata },
    });
    if (metaError) console.error('app_metadata update failed:', metaError.message);
  }
  return { user: data.user, link: buildSetPasswordLink(data.properties.hashed_token) };
}

/** Emails the set-password link via AgentMail. Returns true if the send was accepted. */
export async function sendInviteEmail(email: string, link: string, intro: string): Promise<boolean> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) {
    console.log('AgentMail not configured, skipping invite email');
    return false;
  }
  const text = `${intro}

Set your password here to finish signing up:
${link}

This link works once and expires soon. If it has expired, reply to this email and we'll send a new one.

Welcome aboard!
— TrainField AI`;
  try {
    const res = await fetch('https://api.agentmail.to/v0/inboxes/goodbot@agentmail.to/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: [email], subject: 'Your TrainField AI account is ready', text, from: 'goodbot@agentmail.to' }),
    });
    // Only the status is logged: the response may echo the message body (which holds the link).
    console.log(`Invite email API response status: ${res.status}`);
    return res.ok;
  } catch (e: unknown) {
    console.error('Failed to send invite email:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Finds an auth user by email, paging through every user (not just the first 50). */
export async function findUserByEmail(sb: SupabaseClient, email: string): Promise<User | null> {
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (users.length < perPage) return null;
  }
  throw new Error('User lookup exceeded page limit');
}
