import { NextResponse } from 'next/server';
import { getCaller, isManager } from '@/lib/server/caller';
import { updatePersona, deletePersona } from '@/lib/server/personas';

// GET /api/personas — custom personas for the caller's team.
// Managers/admins see all of them; reps see only active ones (for practice).
export async function GET() {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    const teamId = caller.profile?.team_id;
    if (!teamId) return NextResponse.json({ personas: [] });

    let query = caller.sb.from('custom_personas').select('*').eq('team_id', teamId);
    if (!isManager(caller.profile)) query = query.eq('active', true);
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Could not load personas' }, { status: 500 });
    return NextResponse.json({ personas: data || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/personas — create a persona for the caller's team (manager/admin only).
export async function POST(req: Request) {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    if (!isManager(caller.profile)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const teamId = caller.profile?.team_id;
    if (!teamId) return NextResponse.json({ error: 'You need to be on a team to add personas' }, { status: 400 });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { name, emoji, color, description, systemPrompt, openingLine, voicePitch, voiceRate } = body;
    if (typeof name !== 'string' || !name || typeof systemPrompt !== 'string' || !systemPrompt || typeof openingLine !== 'string' || !openingLine) {
      return NextResponse.json({ error: 'name, systemPrompt, and openingLine are required' }, { status: 400 });
    }

    const { data, error } = await caller.sb
      .from('custom_personas')
      .insert({
        team_id: teamId,
        manager_id: caller.user.id,
        name,
        emoji: typeof emoji === 'string' && emoji ? emoji : '🎯',
        color: typeof color === 'string' && color ? color : '#D4860A',
        description: typeof description === 'string' ? description : '',
        system_prompt: systemPrompt,
        opening_line: openingLine,
        voice_pitch: typeof voicePitch === 'number' ? voicePitch : 1.0,
        voice_rate: typeof voiceRate === 'number' ? voiceRate : 1.0,
        active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Could not save persona' }, { status: 500 });
    return NextResponse.json({ persona: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH/DELETE /api/personas?id=... (what the manager PersonaCreator calls)
export async function PATCH(req: Request) {
  return updatePersona(req, new URL(req.url).searchParams.get('id'));
}

export async function DELETE(req: Request) {
  return deletePersona(new URL(req.url).searchParams.get('id'));
}
