import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const supabaseServer = await createClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Server auth failed
    }

    if (!userId) {
      userId = req.headers.get('x-user-id') ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scenario_name, transcript, scores, coaching_tips, recommended_drill, duration_seconds } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

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
    let userId: string | null = null;
    try {
      const supabaseServer = await createClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // fallback to explicit header
    }

    if (!userId) {
      userId = req.headers.get('x-user-id') ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '20');

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
