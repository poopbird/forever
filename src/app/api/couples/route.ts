import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

const ALLOWED_PROFILE_FIELDS = new Set([
  'name', 'start_date', 'bio', 'cover_photo_url', 'cover_video_url',
  'wedding_date', 'wedding_venue', 'wedding_city', 'wedding_time_start', 'wedding_time_end',
  'rsvp_enabled', 'rsvp_locked_at', 'reminder_days_before', 'invite_message_template',
  'calendar_description', 'album_mode', 'film_reel_enabled', 'invitation_theme', 'invitation_photo_url',
]);

/** GET /api/couples — return album_mode (and other light config) for the current couple */
export async function GET() {
  const supabase      = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const { data, error } = await adminSupabase
    .from('couples')
    .select('id, name, album_mode, film_reel_enabled')
    .eq('id', coupleId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST /api/couples — called by signup page to create a new couple + membership */
export async function POST() {
  const supabase      = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Guard: don't create a second couple if one already exists
  const existing = await getCoupleId(user.id);
  if (existing) return NextResponse.json({ coupleId: existing }, { status: 200 });

  // Create the couple row
  const { data: couple, error: coupleErr } = await adminSupabase
    .from('couples')
    .insert({ name: 'Our Story' })
    .select('id')
    .single();

  if (coupleErr || !couple) {
    return NextResponse.json({ error: coupleErr?.message ?? 'Failed to create couple' }, { status: 500 });
  }

  // Link the user as owner
  const { error: memberErr } = await adminSupabase
    .from('couple_members')
    .insert({ couple_id: couple.id, user_id: user.id, role: 'owner' });

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({ coupleId: couple.id }, { status: 201 });
}

/** PATCH /api/couples — update couple profile (name, start_date, bio, cover URLs) */
export async function PATCH(request: Request) {
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
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED_PROFILE_FIELDS.has(k)),
  );

  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from('couples')
    .update(sanitised)
    .eq('id', coupleId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
