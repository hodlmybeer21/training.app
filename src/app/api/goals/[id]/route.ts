import { deactivateGoal } from '@/lib/server/goals';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deactivateGoal(id || null);
}
