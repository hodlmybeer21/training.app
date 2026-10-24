import { NextResponse } from 'next/server';
import { getCaller } from '@/lib/server/caller';
import { ACCOUNT_COLUMNS, parseAccountInput, personaAllowed, readJson } from '@/lib/server/accounts';

// PATCH /api/accounts/:id — edit one of the caller's own accounts. Owner and team cannot change.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    const { id } = await ctx.params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await readJson(req);
    if (body instanceof NextResponse) return body;
    const parsed = parseAccountInput(body, true);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (!Object.keys(parsed.value).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const { data: existing } = await caller.sb.from('accounts').select('id').eq('id', id).eq('rep_id', caller.user.id).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (parsed.value.persona_id && !(await personaAllowed(caller.sb, parsed.value.persona_id, caller.profile?.team_id))) {
      return NextResponse.json({ error: 'That persona is not available to you' }, { status: 400 });
    }

    const { data, error } = await caller.sb
      .from('accounts')
      .update(parsed.value)
      .eq('id', id)
      .eq('rep_id', caller.user.id)
      .select(ACCOUNT_COLUMNS)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Could not save account' }, { status: 500 });
    return NextResponse.json({ account: data });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
