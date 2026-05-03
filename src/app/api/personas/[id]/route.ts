import { createClient } from '@/utils/supabase/client';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Verify it's the creator or a manager
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await supabase
      .from('custom_personas')
      .delete()
      .eq('id', id)
      .eq('team_id', profile.team_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await req.json();
    delete body.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'manager' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Map camelCase to snake_case
    const dbBody: Record<string, any> = {};
    if (body.name) dbBody.name = body.name;
    if (body.emoji) dbBody.emoji = body.emoji;
    if (body.color) dbBody.color = body.color;
    if (body.description !== undefined) dbBody.description = body.description;
    if (body.systemPrompt) dbBody.system_prompt = body.systemPrompt;
    if (body.openingLine) dbBody.opening_line = body.openingLine;
    if (body.voicePitch !== undefined) dbBody.voice_pitch = body.voicePitch;
    if (body.voiceRate !== undefined) dbBody.voice_rate = body.voiceRate;
    if (body.active !== undefined) dbBody.active = body.active;

    const { data, error } = await supabase
      .from('custom_personas')
      .update(dbBody)
      .eq('id', id)
      .eq('team_id', profile.team_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ persona: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}