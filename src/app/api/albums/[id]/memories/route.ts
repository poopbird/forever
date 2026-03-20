import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

/** GET /api/albums/[id]/memories — memory_ids in this album (freeform) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('album_memories')
    .select('memory_id')
    .eq('album_id', id)
    .eq('couple_id', coupleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(r => r.memory_id));
}

/**
 * PUT /api/albums/[id]/memories — replace all memory assignments for this album.
 * Body: { memory_ids: string[] }
 * Moves any memory that was in another album out of it first (one album per memory).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const memoryIds: string[] = Array.isArray((body as Record<string, unknown>)?.memory_ids)
    ? ((body as Record<string, unknown>).memory_ids as string[])
    : [];

  const admin = createAdminClient();

  // Remove these memories from any other album (one-album-per-memory constraint)
  if (memoryIds.length > 0) {
    await admin
      .from('album_memories')
      .delete()
      .in('memory_id', memoryIds)
      .eq('couple_id', coupleId)
      .neq('album_id', id);
  }

  // Delete all current assignments for this album
  await admin.from('album_memories').delete().eq('album_id', id).eq('couple_id', coupleId);

  // Insert new assignments
  if (memoryIds.length > 0) {
    const rows = memoryIds.map(memory_id => ({ album_id: id, memory_id, couple_id: coupleId }));
    const { error } = await admin.from('album_memories').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
