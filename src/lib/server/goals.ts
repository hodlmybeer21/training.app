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
    const { error } = await caller.sb
      .from('team_goals')
      .update({ active: false })
      .eq('id', id)
      .eq('team_id', caller.profile.team_id);
    if (error) return NextResponse.json({ error: 'Could not update goal' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
