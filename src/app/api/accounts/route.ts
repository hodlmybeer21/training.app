import { NextResponse } from 'next/server';
import { getCaller } from '@/lib/server/caller';
import { ACCOUNT_COLUMNS, listOwnAccounts, parseAccountInput, personaAllowed, readJson } from '@/lib/server/accounts';

// GET /api/accounts — the signed-in rep's own store-owner accounts with recent practice scores.
export async function GET() {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    const result = await listOwnAccounts(caller);
    if ('error' in result) return NextResponse.json({ error: 'Could not load accounts' }, { status: 500 });
    return NextResponse.json({ accounts: result.accounts });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/accounts — create an account owned by the caller. rep_id and team_id come from the session.
export async function POST(req: Request) {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    const body = await readJson(req);
    if (body instanceof NextResponse) return body;
    const parsed = parseAccountInput(body, false);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (!(await personaAllowed(caller.sb, parsed.value.persona_id!, caller.profile?.team_id))) {
      return NextResponse.json({ error: 'That persona is not available to you' }, { status: 400 });
    }
    const { data, error } = await caller.sb
      .from('accounts')
      .insert({ ...parsed.value, rep_id: caller.user.id, team_id: caller.profile?.team_id ?? null })
      .select(ACCOUNT_COLUMNS)
      .single();
    if (error) return NextResponse.json({ error: 'Could not save account' }, { status: 500 });
    return NextResponse.json({ account: { ...data, practice_count: 0, recent_sessions: [] } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
