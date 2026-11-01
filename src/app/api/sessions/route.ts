import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Practice sessions are written by /api/analyze when a verified call is scored on the
// server. Saving client-supplied scores is no longer allowed.
export async function POST() {
  return NextResponse.json(
    { error: 'Sessions are saved automatically when a call is scored.', code: 'scores_are_server_side' },
    { status: 410 },
  );
}

export async function GET(req: NextRequest) {
  try {
    // Only trust the signed-in session cookie, never a client-supplied user ID.
    const userId = (await getSessionUser())?.id ?? null;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const limit = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('limit') || '20') || 20, 1), 100);

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ sessions: data });
  } catch (e: unknown) {
    console.error('sessions route error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
