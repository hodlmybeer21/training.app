import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminEmail } from '@/lib/admin';

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
    const profile = data || { display_name: user.email?.split('@')[0] || 'User', avatar_initial: (user.email?.[0] || 'U').toUpperCase(), bio: null, role: null, team_id: null };
    // isAdmin is computed on the server so no admin email has to ship to the browser.
    // Admin = email listed in ADMIN_EMAILS.
    const isAdmin = isAdminEmail(user.email);
    // Best effort: team name for the settings page (null if not readable).
    let teamName: string | null = null;
    if (profile.team_id) {
      const { data: team } = await supabase.from('teams').select('name').eq('id', profile.team_id).maybeSingle();
      teamName = team?.name ?? null;
    }
    return NextResponse.json({ profile, isAdmin, teamName });
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
