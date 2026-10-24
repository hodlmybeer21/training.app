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

    const { scenario_name, transcript, scores, coaching_tips, recommended_drill, duration_seconds, account_id } = await req.json();

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
        overall_score: scores?.overallScore ?? null,
        discovery: scores?.discovery ?? null,
        objection_handling: scores?.objectionHandling ?? null,
        value_articulation: scores?.valueArticulation ?? null,
        confidence_pacing: scores?.confidencePacing ?? null,
        closing_technique: scores?.closingTechnique ?? null,
        strengths: scores?.strengths ?? [],
        opportunities: scores?.opportunities ?? [],
        coaching_tips: coaching_tips ?? [],
        recommended_drill: recommended_drill ?? null,
        duration_seconds: duration_seconds ?? null,
        transcript: transcript ?? [],
        account_id: ownedAccountId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
