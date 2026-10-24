/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const session = { user: null as null | { id: string; email: string | null } };
vi.mock('@/lib/server/auth', () => ({ getSessionUser: async () => session.user }));

type Row = Record<string, unknown>;
const db: { profiles: Row[]; authUsers: Record<string, { app_metadata?: Row }> } = { profiles: [], authUsers: {} };
const calls: { createUser: number; generateLink: Row[]; updateUserById: Row[] } = { createUser: 0, generateLink: [], updateUserById: [] };

function query(table: string) {
  const filters: [string, unknown][] = [];
  const q: any = {
    select: () => q,
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    order: () => q,
    in: () => q,
    insert: () => q,
    upsert: () => q,
    update: () => q,
    delete: () => q,
    rows: () => (table === 'profiles' ? db.profiles : table === 'teams' ? [{ id: 't-new', name: 'Team' }] : []).filter((r) => filters.every(([k, v]) => r[k] === v)),
    single: async () => ({ data: q.rows()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: q.rows()[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown) => res({ data: q.rows(), error: null }),
  };
  return q;
}
const fakeClient = {
  from: (t: string) => query(t),
  auth: {
    admin: {
      getUserById: async (id: string) => ({ data: { user: db.authUsers[id] ? { id, ...db.authUsers[id] } : null } }),
      createUser: async () => { calls.createUser++; return { data: { user: { id: 'x' } }, error: null }; },
      listUsers: async () => ({ data: { users: [] }, error: null }),
      generateLink: async (args: Row) => { calls.generateLink.push(args); return { data: { user: { id: 'new-user', app_metadata: {} }, properties: { hashed_token: 'HASHED' } }, error: null }; },
      updateUserById: async (id: string, attrs: Row) => { calls.updateUserById.push({ id, ...attrs }); return { error: null }; },
    },
  },
};
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));

beforeEach(() => {
  session.user = null;
  db.profiles = [];
  db.authUsers = {};
  calls.createUser = 0; calls.generateLink = []; calls.updateUserById = [];
  process.env.ADMIN_EMAILS = 'boss@example.com';
});

const json = (body: unknown, method = 'POST') => new Request('http://x/api', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

// ── Item 1: seat limits ──────────────────────────────────────────────────────
describe('seat limits', () => {
  it('blocks create-rep with 403 when a Small Team is at 5 seats', async () => {
    session.user = { id: 'admin', email: 'boss@example.com' };
    db.profiles = [{ id: 'm1', role: 'manager', team_id: 't1' }, ...[1, 2, 3, 4].map((i) => ({ id: `r${i}`, role: 'rep', team_id: 't1' }))];
    db.authUsers = { m1: { app_metadata: { tier: 'small-team' } } };
    const { POST } = await import('@/app/api/admin/route');
    const res = await POST(json({ action: 'create-rep', email: 'a@b.c', password: 'x', managerId: 'm1' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('seat_limit_reached');
    expect(body.error).toMatch(/5 of 5 seats/);
    expect(calls.createUser).toBe(0);
    expect(calls.generateLink.length).toBe(0);
  });

  it('allows create-rep under the limit', async () => {
    session.user = { id: 'admin', email: 'boss@example.com' };
    db.profiles = [{ id: 'm1', role: 'manager', team_id: 't1' }, { id: 'r1', role: 'rep', team_id: 't1' }];
    db.authUsers = { m1: { app_metadata: { tier: 'small-team' } } };
    const { POST } = await import('@/app/api/admin/route');
    const res = await POST(json({ action: 'create-rep', email: 'a@b.c', managerId: 'm1' }));
    expect(res.status).toBe(201);
    expect(calls.createUser).toBe(0); // no admin-typed password
    expect(calls.generateLink[0]).toMatchObject({ type: 'invite', email: 'a@b.c' });
    const body = await res.json();
    expect(body.inviteLink).toContain('/set-password?token_hash=HASHED&type=invite');
  });

  it('ignores a self-edited user_metadata tier', async () => {
    const { checkSeatAvailable } = await import('@/lib/server/seats');
    db.profiles = [{ id: 'm1', role: 'manager', team_id: 't1' }];
    db.authUsers = { m1: { app_metadata: { tier: 'solo' } } };
    const r = await checkSeatAvailable(fakeClient as any, { id: 'm1', team_id: 't1' });
    expect(r.ok).toBe(false); // Solo = 1 seat, already used by the manager
  });
});

// ── Item 2: no plaintext passwords in the webhook ────────────────────────────
describe('stripe webhook invite flow', () => {
  it('source never generates or emails a password', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8')
      + fs.readFileSync('src/lib/server/checkout.ts', 'utf8')
      + fs.readFileSync('src/lib/server/invites.ts', 'utf8');
    expect(src).not.toMatch(/tempPassword|generateSecurePassword|Password: \$\{/);
    expect(src).toMatch(/generateLink\(\{\s*type: 'invite'/);
    // Signature verification line unchanged
    expect(src).toContain("event = getStripe().webhooks.constructEvent(body, sig, whsec!);");
  });

  it('rejects unsigned requests with 400', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(new Request('http://x', { method: 'POST', body: '{}' }) as any);
    expect(res.status).toBe(400);
  });
});

// ── Item 3: auth on routes ───────────────────────────────────────────────────
describe('route auth', () => {
  it('unauthenticated calls get 401', async () => {
    const personas = await import('@/app/api/personas/route');
    const personaId = await import('@/app/api/personas/[id]/route');
    const admin = await import('@/app/api/admin/route');
    const goals = await import('@/app/api/goals/route');
    const goalId = await import('@/app/api/goals/[id]/route');
    const sessions = await import('@/app/api/sessions/route');
    const ctx = { params: Promise.resolve({ id: 'p1' }) };
    const results = [
      await personas.GET(),
      await personas.POST(json({})),
      await personas.PATCH(new Request('http://x/api/personas?id=p1', { method: 'PATCH', body: '{}' })),
      await personas.DELETE(new Request('http://x/api/personas?id=p1', { method: 'DELETE' })),
      await personaId.PATCH(new Request('http://x', { method: 'PATCH', body: '{}' }), ctx),
      await personaId.DELETE(new Request('http://x', { method: 'DELETE' }), ctx),
      await admin.GET(new Request('http://x') as any),
      await admin.POST(json({ action: 'delete-user', userId: 'u' })),
      await goals.GET(new Request('http://x') as any),
      await goals.POST(json({ goal_text: 'x' }) as any),
      await goalId.DELETE(new Request('http://x', { method: 'DELETE' }), ctx),
      await sessions.GET(new Request('http://x') as any),
    ];
    expect(results.map((r) => r.status)).toEqual(Array(results.length).fill(401));
  });

  it('a profile with role admin but no ADMIN_EMAILS entry is forbidden from /api/admin', async () => {
    session.user = { id: 'u1', email: 'someone@example.com' };
    db.profiles = [{ id: 'u1', role: 'admin', team_id: null }];
    const admin = await import('@/app/api/admin/route');
    expect((await admin.GET(new Request('http://x') as any)).status).toBe(403);
    expect((await admin.POST(json({ action: 'delete-user', userId: 'u2' }))).status).toBe(403);
  });

  it('reps cannot create, edit or delete personas', async () => {
    session.user = { id: 'r1', email: 'rep@example.com' };
    db.profiles = [{ id: 'r1', role: 'rep', team_id: 't1' }];
    const personas = await import('@/app/api/personas/route');
    expect((await personas.POST(json({ name: 'a', systemPrompt: 'b', openingLine: 'c' }))).status).toBe(403);
    expect((await personas.PATCH(new Request('http://x/api/personas?id=p1', { method: 'PATCH', body: '{"active":false}' }))).status).toBe(403);
    expect((await personas.DELETE(new Request('http://x/api/personas?id=p1', { method: 'DELETE' }))).status).toBe(403);
    expect((await personas.GET()).status).toBe(200);
  });

  it('update-role rejects unknown roles', async () => {
    session.user = { id: 'admin', email: 'boss@example.com' };
    const admin = await import('@/app/api/admin/route');
    expect((await admin.POST(json({ action: 'update-role', userId: 'u2', role: 'superuser' }))).status).toBe(400);
  });
});

// ── Queue item 1 follow-ups ─────────────────────────────────────────────────
describe('stripe plans', () => {
  it('checkout metadata and price IDs map to the same tier', async () => {
    const t = await import('@/lib/tiers');
    expect(t.tierFromCheckoutMetadata({ plan: 'small', tier: 'small-team' })).toBe('small-team');
    // Old sessions put the plan key in metadata.priceId
    expect(t.tierFromCheckoutMetadata({ priceId: 'team' })).toBe('team');
    expect(t.tierFromCheckoutMetadata({ priceId: t.priceIdForPlan('solo') })).toBe('solo');
    expect(t.tierFromCheckoutMetadata({ priceId: 'nope' })).toBeNull();
    for (const k of Object.keys(t.PLANS) as (keyof typeof t.PLANS)[]) {
      expect(t.tierForPriceId(t.priceIdForPlan(k))).toBe(t.PLANS[k].tier);
    }
    expect(t.roleForTier('solo')).toBe('rep');
    expect(t.roleForTier('team')).toBe('manager');
  });

  it('webhook handler stores tier separately and keeps role valid', async () => {
    const upserts: Row[] = [];
    const sb: any = {
      ...fakeClient,
      from: (table: string) => {
        const q = query(table);
        q.upsert = (row: Row) => { upserts.push(row); return Promise.resolve({ error: null }); };
        return q;
      },
    };
    const { handleCheckoutCompleted } = await import('@/lib/server/checkout');
    await handleCheckoutCompleted(sb, {} as any, { id: 'cs_1', customer_email: 'New@Example.com', metadata: { plan: 'small', tier: 'small-team' } } as any);
    expect(calls.generateLink[0]).toMatchObject({ type: 'invite', email: 'new@example.com' });
    expect(calls.updateUserById[0]).toMatchObject({ id: 'new-user', app_metadata: { tier: 'small-team' } });
    expect(upserts[0]).toMatchObject({ id: 'new-user', role: 'manager', tier: 'small-team' });
  });

  it('user lookup pages past the first page of users', async () => {
    const { findUserByEmail } = await import('@/lib/server/invites');
    const pages: number[] = [];
    const sb: any = {
      auth: { admin: { listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
        pages.push(page);
        const users = page < 3 ? Array.from({ length: perPage }, (_, i) => ({ id: `u${page}-${i}`, email: `u${page}-${i}@x.com` })) : [{ id: 'target', email: 'Target@X.com' }];
        return { data: { users }, error: null };
      } } },
    };
    expect((await findUserByEmail(sb, 'target@x.com'))?.id).toBe('target');
    expect(pages).toEqual([1, 2, 3]);
  });
});

describe('default seat limit', () => {
  it('a team with no paid tier is capped at the default limit', async () => {
    const { checkSeatAvailable } = await import('@/lib/server/seats');
    const { DEFAULT_SEAT_LIMIT } = await import('@/lib/tiers');
    db.profiles = [{ id: 'm1', role: 'manager', team_id: 't1' }, ...Array.from({ length: DEFAULT_SEAT_LIMIT - 1 }, (_, i) => ({ id: `r${i}`, role: 'rep', team_id: 't1' }))];
    const full = await checkSeatAvailable(fakeClient as any, { id: 'm1', team_id: 't1' });
    expect(full.ok).toBe(false);
    expect(full.limit).toBe(DEFAULT_SEAT_LIMIT);
    db.profiles = db.profiles.slice(0, 2);
    expect((await checkSeatAvailable(fakeClient as any, { id: 'm1', team_id: 't1' })).ok).toBe(true);
  });
});

describe('admin create-manager', () => {
  it('uses an invite link, never a password', async () => {
    session.user = { id: 'admin', email: 'boss@example.com' };
    const { POST } = await import('@/app/api/admin/route');
    const res = await POST(json({ action: 'create-manager', email: 'mgr@example.com', teamName: 'Team A' }));
    expect(res.status).toBe(201);
    expect(calls.createUser).toBe(0);
    expect(calls.generateLink[0]).toMatchObject({ type: 'invite', email: 'mgr@example.com' });
    const src = (await import('node:fs')).readFileSync('src/app/dashboard/admin/page.tsx', 'utf8');
    expect(src).not.toMatch(/Password<\/label>/);
  });
});
