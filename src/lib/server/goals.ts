import { NextResponse } from 'next/server';
import { getCaller, isManager } from '@/lib/server/caller';

/** Deactivates one goal. Only a manager/admin on the goal's team can do it. */
export async function deactivateGoal(id: string | null) {
  try {
    const caller = await getCaller();
    if (caller instanceof NextResponse) return caller;
    if (!id) return NextResponse.json({ error: 'Missing goal ID' }, { status: 400 });
    if (!isManager(caller.profile) || !caller.profile?.team_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Scoped to the caller's own team. A goal on another team matches no row, and
    // that is reported as not found instead of a silent success.
    const { data, error } = await caller.sb
      .from('team_goals')
      .update({ active: false })
      .eq('id', id)
      .eq('team_id', caller.profile.team_id)
      .select('id');
    if (error) return NextResponse.json({ error: 'Could not update goal' }, { status: 500 });
    if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
