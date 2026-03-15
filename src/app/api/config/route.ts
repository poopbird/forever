import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

// Maps legacy config keys → the column on the couples table
const KEY_TO_COLUMN: Record<string, string> = {
  cover_video_url: 'cover_video_url',
};

/** GET /api/config?key=cover_video_url */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key || !KEY_TO_COLUMN[key])
    return NextResponse.json({ error: 'unknown config key' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ value: null });

  const column = KEY_TO_COLUMN[key];
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from('couples').select(column).eq('id', coupleId).single();

  return NextResponse.json({ value: (data as Record<string, unknown>)?.[column] ?? null });
}

/** POST /api/config  body: { key, value } */
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { key, value } = body as Record<string, unknown>;

  if (typeof key !== 'string' || !KEY_TO_COLUMN[key])
    return NextResponse.json({ error: 'unknown config key' }, { status: 400 });
  if (value !== null && typeof value !== 'string')
    return NextResponse.json({ error: 'value must be a string or null' }, { status: 400 });
  if (typeof value === 'string' && value.length > 2048)
    return NextResponse.json({ error: 'value too long (max 2048 chars)' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const column = KEY_TO_COLUMN[key];
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from('couples').update({ [column]: value }).eq('id', coupleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
