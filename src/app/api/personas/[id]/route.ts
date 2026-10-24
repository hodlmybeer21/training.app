import { updatePersona, deletePersona } from '@/lib/server/personas';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updatePersona(req, id || null);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deletePersona(id || null);
}
