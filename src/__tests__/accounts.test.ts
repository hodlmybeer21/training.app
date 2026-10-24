/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Store-owner accounts API: owner scoping, locked owner fields, persona checks,
// and session linking. RLS itself is checked by supabase/tests/accounts_rls.sql.

const session = { user: null as null | { id: string; email: string | null } };
vi.mock('@/lib/server/auth', () => ({ getSessionUser: async () => session.user }));

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
let nextId = 1;
const uuid = () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let op: 'select' | 'insert' | 'update' = 'select';
  let payload: Row | null = null;
  let limit = Infinity;
  const run = () => {
    const rows = (db[table] ||= []);
    if (op === 'insert') {
      const row = { id: uuid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...payload };
      rows.push(row);
      return [row];
    }
    const hit = rows.filter((r) => filters.every((f) => f(r)));
    if (op === 'update') hit.forEach((r) => Object.assign(r, payload));
    return hit.slice(0, limit);
  };
  const q: any = {
    select: () => q,
    eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return q; },
    in: (k: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[k])); return q; },
    order: () => q,
    limit: (n: number) => { limit = n; return q; },
    insert: (p: Row) => { op = 'insert'; payload = p; return q; },
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    single: async () => { const r = run(); return r[0] ? { data: r[0], error: null } : { data: null, error: { message: 'none' } }; },
    maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown) => res({ data: run(), error: null }),
  };
  return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => query(t) }) }));

const REP_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const REP_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const TEAM = 'tttttttt-0000-4000-8000-000000000001';
const TEAM_PERSONA = 'cccccccc-0000-4000-8000-000000000001';
const OTHER_TEAM_PERSONA = 'dddddddd-0000-4000-8000-000000000001';

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  db.profiles = [
    { id: REP_A, role: 'rep', team_id: TEAM },
    { id: REP_B, role: 'rep', team_id: TEAM },
  ];
  db.custom_personas = [
    { id: TEAM_PERSONA, team_id: TEAM, active: true },
    { id: OTHER_TEAM_PERSONA, team_id: 'other-team', active: true },
  ];
  db.accounts = [];
  db.sessions = [];
  session.user = null;
});

const req = (body: unknown, method = 'POST') => new Request('http://x/api/accounts', { method, body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const as = (id: string) => { session.user = { id, email: `${id}@example.com` }; };

describe('accounts API', () => {
  it('rejects signed-out callers', async () => {
    const list = await import('@/app/api/accounts/route');
    const one = await import('@/app/api/accounts/[id]/route');
    expect((await list.GET()).status).toBe(401);
    expect((await list.POST(req({ name: 'x', persona_id: 'nh-bar-owner' }))).status).toBe(401);
    expect((await one.PATCH(req({ notes: 'x' }, 'PATCH'), ctx(REP_A))).status).toBe(401);
  });

  it('creates an account owned by the caller and ignores client-sent rep_id/team_id', async () => {
    as(REP_A);
    const { POST } = await import('@/app/api/accounts/route');
    const res = await POST(req({ name: '  Main Street Market ', city: 'Concord', persona_id: 'nh-liquor-store-owner', notes: 'Tuesdays', rep_id: REP_B, team_id: 'evil' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.account.name).toBe('Main Street Market');
    expect(db.accounts).toHaveLength(1);
    expect(db.accounts[0]).toMatchObject({ rep_id: REP_A, team_id: TEAM, persona_id: 'nh-liquor-store-owner', city: 'Concord', address: null });
  });

  it('validates name, persona and note length', async () => {
    as(REP_A);
    const { POST } = await import('@/app/api/accounts/route');
    expect((await POST(req({ persona_id: 'nh-bar-owner' }))).status).toBe(400);
    expect((await POST(req({ name: 'A' }))).status).toBe(400);
    expect((await POST(req({ name: 'A', persona_id: 'made-up' }))).status).toBe(400);
    expect((await POST(req({ name: 'A', persona_id: OTHER_TEAM_PERSONA }))).status).toBe(400);
    expect((await POST(req({ name: 'A', persona_id: 'nh-bar-owner', notes: 'x'.repeat(1001) }))).status).toBe(400);
    expect((await POST(req('not json'))).status).toBe(400);
    expect(db.accounts).toHaveLength(0);
    expect((await POST(req({ name: 'A', persona_id: TEAM_PERSONA }))).status).toBe(201);
  });

  it('lists only the caller\'s accounts, with their own practice scores', async () => {
    db.accounts = [
      { id: 'a1', rep_id: REP_A, team_id: TEAM, name: 'Mine', persona_id: 'nh-bar-owner' },
      { id: 'b1', rep_id: REP_B, team_id: TEAM, name: 'Theirs', persona_id: 'nh-bar-owner' },
    ];
    db.sessions = [
      { id: 's1', user_id: REP_A, account_id: 'a1', overall_score: 81, created_at: '2026-10-20' },
      { id: 's2', user_id: REP_B, account_id: 'a1', overall_score: 10, created_at: '2026-10-21' },
    ];
    as(REP_A);
    const { GET } = await import('@/app/api/accounts/route');
    const body = await (await GET()).json();
    expect(body.accounts.map((a: Row) => a.name)).toEqual(['Mine']);
    expect(body.accounts[0].practice_count).toBe(1);
    expect(body.accounts[0].recent_sessions[0]).toMatchObject({ id: 's1', overall_score: 81 });
  });

  it('edits own accounts only, and never changes the owner or team', async () => {
    const id = 'eeeeeeee-0000-4000-8000-000000000001';
    db.accounts = [{ id, rep_id: REP_A, team_id: TEAM, name: 'Mine', persona_id: 'nh-bar-owner', notes: null }];
    const { PATCH } = await import('@/app/api/accounts/[id]/route');

    as(REP_B);
    expect((await PATCH(req({ notes: 'hijack' }, 'PATCH'), ctx(id))).status).toBe(404);
    expect(db.accounts[0].notes).toBeNull();

    as(REP_A);
    const res = await PATCH(req({ notes: 'Wants a tasting', rep_id: REP_B, team_id: 'evil' }, 'PATCH'), ctx(id));
    expect(res.status).toBe(200);
    expect(db.accounts[0]).toMatchObject({ notes: 'Wants a tasting', rep_id: REP_A, team_id: TEAM });
    expect((await PATCH(req({ persona_id: 'made-up' }, 'PATCH'), ctx(id))).status).toBe(400);
    expect((await PATCH(req({}, 'PATCH'), ctx(id))).status).toBe(400);
    expect((await PATCH(req({ notes: 'x' }, 'PATCH'), ctx('not-a-uuid'))).status).toBe(404);
  });
});

describe('sessions account link', () => {
  const ACCT = 'ffffffff-0000-4000-8000-000000000001';
  it('saves account_id only when the caller owns the account', async () => {
    db.accounts = [{ id: ACCT, rep_id: REP_A, team_id: TEAM, name: 'Mine', persona_id: 'nh-bar-owner' }];
    const { POST } = await import('@/app/api/sessions/route');

    as(REP_A);
    expect((await POST(req({ scenario_name: 's', scores: { overallScore: 80 }, account_id: ACCT }) as any)).status).toBe(200);
    as(REP_B);
    expect((await POST(req({ scenario_name: 's', scores: { overallScore: 50 }, account_id: ACCT }) as any)).status).toBe(200);

    expect(db.sessions.map((s) => [s.user_id, s.account_id])).toEqual([[REP_A, ACCT], [REP_B, null]]);
  });
});
