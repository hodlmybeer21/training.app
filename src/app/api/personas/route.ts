import { createClient } from '@/utils/supabase/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's team_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('custom_personas')
      .select('*')
      .eq('team_id', profile.team_id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ personas: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'manager' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, emoji, color, description, systemPrompt, openingLine, voicePitch, voiceRate } = body;

    if (!name || !systemPrompt || !openingLine) {
      return NextResponse.json({ error: 'name, systemPrompt, and openingLine are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_personas')
      .insert({
        team_id: profile.team_id,
        manager_id: user.id,
        name,
        emoji: emoji || '🎯',
        color: color || '#D4860A',
        description: description || '',
        system_prompt: systemPrompt,
        opening_line: openingLine,
        voice_pitch: voicePitch || 1.0,
        voice_rate: voiceRate || 1.0,
        active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ persona: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}