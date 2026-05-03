import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

function buildGoalContext(goals: any[]): string {
  if (!goals || goals.length === 0) return '';
  const lines = goals.map((g) => {
    let line = `- ${g.goal_text}`;
    if (g.product_sku) line += ` | SKU focus: ${g.product_sku}`;
    if (g.target_cases) line += ` | Target: ${g.target_cases} cases`;
    if (g.target_pods) line += ` | Target: ${g.target_pods} PODs`;
    if (g.target_date) line += ` | Due: ${g.target_date}`;
    return line;
  });
  return `ACTIVE SALES TARGETS (from your manager):\n${lines.join('\n')}`;
}

// GET /api/goals — fetch active goals for a team (rep) or managed team (manager)
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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createSupabaseClient(supabaseUrl, supabaseKey);

    const { data: profile } = await sb
      .from('profiles').select('*').eq('id', userId).single();

    if (!profile?.team_id) {
      return NextResponse.json({ goals: [], goal_context: '' });
    }

    const { data: goals } = await sb
      .from('team_goals')
      .select('*')
      .eq('team_id', profile.team_id)
      .eq('active', true)
      .order('created_at', { ascending: true });

    const goal_context = buildGoalContext(goals || []);
    return NextResponse.json({ goals: goals || [], goal_context });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// POST /api/goals — create a new goal (manager/admin only)
export async function POST(req: NextRequest) {
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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createSupabaseClient(supabaseUrl, supabaseKey);

    const { data: profile } = await sb
      .from('profiles').select('*').eq('id', userId).single();

    if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { goal_text, product_sku, goal_type, target_cases, target_pods, target_date } = await req.json();

    if (!goal_text?.trim()) {
      return NextResponse.json({ error: 'goal_text is required' }, { status: 400 });
    }

    const { data: goal, error } = await sb
      .from('team_goals')
      .insert({
        team_id: profile.team_id,
        manager_id: userId,
        goal_text: goal_text.trim(),
        product_sku: product_sku?.trim() || null,
        goal_type: goal_type || 'volume',
        target_cases: target_cases ? parseInt(target_cases) : null,
        target_pods: target_pods ? parseInt(target_pods) : null,
        target_date: target_date || null,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ goal });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// DELETE /api/goals/[id] — deactivate a goal (manager/admin only)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing goal ID' }, { status: 400 });

    let userId: string | null = null;
    try {
      const sb = await createClient();
      const { data: { user } } = await sb.auth.getUser();
      userId = user?.id ?? null;
    } catch {}
    if (!userId) {
      userId = req.headers.get('x-user-id') ?? null;
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createSupabaseClient(supabaseUrl, supabaseKey);

    const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await sb.from('team_goals').update({ active: false }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
