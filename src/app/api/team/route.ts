import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

const SKILL_KEYS = ['discovery', 'objection_handling', 'value_articulation', 'confidence_pacing', 'closing_technique'] as const;

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && !isNaN(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const sb = await createClient();
      const { data: { user } } = await sb.auth.getUser();
      userId = user?.id ?? null;
    } catch {}

    if (!userId) {
      userId = req.headers.get('x-user-id') ?? null;
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Load current user's profile to check role/team_id
    const { data: myProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });
    if (myProfile.role !== 'manager' && myProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team member IDs
    let memberIds: string[] = [];
    if (myProfile.team_id) {
      const { data: teamProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('team_id', myProfile.team_id);
      memberIds = (teamProfiles || []).map((p: { id: string }) => p.id);
    } else {
      const { data: reports } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', userId);
      memberIds = (reports || []).map((p: { id: string }) => p.id);
    }
    if (memberIds.length === 0) {
      return NextResponse.json({ manager: myProfile, reps: [], team_session_count: 0, team_avg_overall: null });
    }

    // Load team member profiles and sessions in parallel
    const [{ data: teamProfiles }, { data: allSessions }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', memberIds),
      supabase.from('sessions'). select('*').in('user_id', memberIds). order('created_at', { ascending: false }),
    ]);

    const allSessionsTyped = (allSessions || []) as any[];

    // Build per-rep summaries
    const reps = (teamProfiles || []).map((profile: any) => {
      const mySessions = allSessionsTyped.filter((s) => s.user_id === profile.id);
      const overallScores = mySessions.map((s) => s.overall_score as number | null);
      const radarData = SKILL_KEYS.map((key) => {
        const vals = mySessions.map((s) => s[key] as number | null);
        return {
          subject: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: avg(vals) || 0,
        };
      });
      return {
        profile,
        session_count: mySessions.length,
        avg_overall: avg(overallScores),
        radarData,
        recentSessions: mySessions.slice(0, 5),
      };
    });

    const teamOverallScores = allSessionsTyped.map((s) => s.overall_score as number | null);

    return NextResponse.json({
      manager: myProfile,
      reps,
      team_session_count: allSessionsTyped.length,
      team_avg_overall: avg(teamOverallScores),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
