import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

// Fields the client is allowed to supply when creating a memory
const ALLOWED_FIELDS = new Set([
  'date', 'caption', 'media_url', 'media_urls', 'media_type',
  'location_name', 'lat', 'lng', 'show_on_map', 'milestone_label', 'dot_emoji',
]);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('memories')
    .select('*')
    .eq('couple_id', coupleId)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  const { caption, date, media_type } = body as Record<string, unknown>;

  if (typeof caption !== 'string' || !caption.trim())
    return NextResponse.json({ error: 'caption is required' }, { status: 400 });
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  if (media_type !== 'photo' && media_type !== 'video')
    return NextResponse.json({ error: 'media_type must be "photo" or "video"' }, { status: 400 });

  const sanitised = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED_FIELDS.has(k)),
  );

  // Always inject couple_id server-side — never trust the client
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('memories')
    .insert({ ...sanitised, couple_id: coupleId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
