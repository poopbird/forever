import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

const ALLOWED = new Set(['label', 'caption', 'cover_photo_url', 'date_start', 'date_end', 'sort_order']);

/** GET /api/albums — all albums for the current couple */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('couple_albums')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/albums — create a new album */
export async function POST(request: Request) {
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

  if (!sanitised.label)
    return NextResponse.json({ error: 'label is required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('couple_albums')
    .insert({ ...sanitised, couple_id: coupleId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
