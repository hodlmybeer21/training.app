import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_initial, bio, role, team_id')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return NextResponse.json({
      profile: data || { display_name: user.email?.split('@')[0] || 'User', avatar_initial: (user.email?.[0] || 'U').toUpperCase(), bio: null, role: null, team_id: null }
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { display_name, avatar_initial, bio } = await req.json();

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: display_name || 'User',
        avatar_initial: avatar_initial || user.email?.[0]?.toUpperCase() || 'U',
        bio: bio || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
