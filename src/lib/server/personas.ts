import { NextResponse } from 'next/server';
import { getCaller, isManager } from '@/lib/server/caller';

// Shared handlers for /api/personas (?id=) and /api/personas/[id].
// Only managers/admins of the persona's team can change or delete it.

export async function updatePersona(req: Request, id: string | null) {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!isManager(caller.profile) || !caller.profile?.team_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Whitelist: team_id, manager_id and id can never be changed from the client.
    const dbBody: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name) dbBody.name = body.name;
    if (typeof body.emoji === 'string' && body.emoji) dbBody.emoji = body.emoji;
    if (typeof body.color === 'string' && body.color) dbBody.color = body.color;
    if (typeof body.description === 'string') dbBody.description = body.description;
    if (typeof body.systemPrompt === 'string' && body.systemPrompt) dbBody.system_prompt = body.systemPrompt;
    if (typeof body.openingLine === 'string' && body.openingLine) dbBody.opening_line = body.openingLine;
    if (typeof body.voicePitch === 'number') dbBody.voice_pitch = body.voicePitch;
    if (typeof body.voiceRate === 'number') dbBody.voice_rate = body.voiceRate;
    if (typeof body.active === 'boolean') dbBody.active = body.active;
    if (Object.keys(dbBody).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await caller.sb
      .from('custom_personas')
      .update(dbBody)
      .eq('id', id)
      .eq('team_id', caller.profile.team_id)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: 'Could not update persona' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ persona: data });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function deletePersona(id: string | null) {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!isManager(caller.profile) || !caller.profile?.team_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await caller.sb
      .from('custom_personas')
      .delete()
      .eq('id', id)
      .eq('team_id', caller.profile.team_id);

    if (error) return NextResponse.json({ error: 'Could not delete persona' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
