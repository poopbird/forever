import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

const ALLOWED_FIELDS = new Set([
  'name', 'email', 'phone', 'plus_one_invited',
  'rsvp_status', 'plus_one_attending', 'plus_one_name',
  'dietary_preset', 'dietary_notes',
  'plus_one_dietary_preset', 'plus_one_dietary_notes',
]);

/** PATCH /api/rsvp/guests/[id] — couple edits a guest record */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase      = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const sanitised = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED_FIELDS.has(k)),
  );

  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  // Scope update to this couple so couples can't edit each other's guests
  const { data, error } = await adminSupabase
    .from('rsvp_guests')
    .update(sanitised)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Not found' },          { status: 404 });
  return NextResponse.json(data);
}

/** DELETE /api/rsvp/guests/[id] — couple removes a guest */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase      = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const { error } = await adminSupabase
    .from('rsvp_guests')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
