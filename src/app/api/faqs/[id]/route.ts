import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/faqs/[id] — update question/answer/category/position ───────────
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed  = new Set(['question', 'answer', 'category', 'position']);
  const sanitised = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.has(k)),
  );

  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('faqs')
    .update(sanitised)
    .eq('id', id)
    .eq('couple_id', coupleId) // scoped to couple — no RLS bypass needed
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE /api/faqs/[id] ─────────────────────────────────────────────────────
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('faqs')
    .delete()
    .eq('id', id)
    .eq('couple_id', coupleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
