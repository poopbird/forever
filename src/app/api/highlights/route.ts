import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId }       from '@/lib/couple';
import { NextResponse }      from 'next/server';

// ── GET /api/highlights ───────────────────────────────────────────────────────
// Returns the ordered highlight memories for the authenticated couple.
// Also used by the public guest view via the page's server component (not this route).
export async function GET() {
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('couple_highlights')
    .select('position, memory:memories(*)')
    .eq('couple_id', coupleId)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return flat ordered array of memories
  const memories = (data ?? []).map((row: { position: number; memory: unknown }) => row.memory);
  return NextResponse.json(memories);
}

// ── PUT /api/highlights ───────────────────────────────────────────────────────
// Replaces the couple's entire highlight list.
// Body: { memoryIds: string[] }  — ordered array of up to 10 memory IDs.
export async function PUT(request: Request) {
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { memoryIds } = body as { memoryIds?: unknown };
  if (!Array.isArray(memoryIds) || memoryIds.length > 20) {
    return NextResponse.json(
      { error: 'memoryIds must be an array of up to 20 IDs' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Delete existing highlights for this couple, then insert fresh set
  const { error: delErr } = await admin
    .from('couple_highlights')
    .delete()
    .eq('couple_id', coupleId);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (memoryIds.length > 0) {
    const rows = (memoryIds as string[]).map((memoryId, i) => ({
      couple_id: coupleId,
      memory_id: memoryId,
      position:  i + 1,
    }));

    const { error: insErr } = await admin
      .from('couple_highlights')
      .insert(rows);

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
