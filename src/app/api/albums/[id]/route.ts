import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

const ALLOWED = new Set(['label', 'caption', 'cover_photo_url', 'date_start', 'date_end', 'sort_order']);

/** PATCH /api/albums/[id] — update an album */
export async function PATCH(
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

  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });

  const sanitised = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED.has(k)),
  );

  if (Object.keys(sanitised).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('couple_albums')
    .update(sanitised)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/albums/[id] — delete an album (min 2 enforced client-side; double-checked here) */
export async function DELETE(
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

  // Enforce minimum 2 albums
  const { count } = await admin
    .from('couple_albums')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', coupleId);

  if ((count ?? 0) <= 2)
    return NextResponse.json({ error: 'Minimum 2 albums required' }, { status: 400 });

  const { error } = await admin
    .from('couple_albums')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
