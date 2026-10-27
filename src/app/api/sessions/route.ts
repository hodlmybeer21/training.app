import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Only trust the signed-in session cookie, never a client-supplied user ID.
    const userId = (await getSessionUser())?.id ?? null;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const { account_id } = body;
    // Validate and bound everything the client sends before it is stored.
    const scores = body.scores && typeof body.scores === 'object' ? body.scores : {};
    const score = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null);
    const strList = (v: unknown, n: number, len: number) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, n).map(x => x.slice(0, len)) : [];
    const scenario_name = typeof body.scenario_name === 'string' ? body.scenario_name.slice(0, 300) : 'Practice session';
    const transcript = strList(body.transcript, 200, 4000);
    const coaching_tips = strList(body.coaching_tips, 10, 1000);
    const recommended_drill = typeof body.recommended_drill === 'string' ? body.recommended_drill.slice(0, 1000) : null;
    const duration_seconds = typeof body.duration_seconds === 'number' && Number.isFinite(body.duration_seconds)
      ? Math.max(0, Math.min(4 * 3600, Math.floor(body.duration_seconds))) : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Link the practice run to a store-owner account only if the caller owns that account.
    // An unknown or foreign account id is dropped so the score is still saved.
    let ownedAccountId: string | null = null;
    if (typeof account_id === 'string' && /^[0-9a-f-]{36}$/i.test(account_id)) {
      const { data: acct } = await supabase.from('accounts').select('id').eq('id', account_id).eq('rep_id', userId).maybeSingle();
      if (acct) ownedAccountId = account_id;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        scenario_name,
        overall_score: score(scores.overallScore),
        discovery: score(scores.discovery),
        objection_handling: score(scores.objectionHandling),
        value_articulation: score(scores.valueArticulation),
        confidence_pacing: score(scores.confidencePacing),
        closing_technique: score(scores.closingTechnique),
        strengths: strList(scores.strengths, 10, 1000),
        opportunities: strList(scores.opportunities, 10, 1000),
        coaching_tips,
        recommended_drill,
        duration_seconds,
        transcript,
        account_id: ownedAccountId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (e: unknown) {
    console.error('sessions route error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
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
