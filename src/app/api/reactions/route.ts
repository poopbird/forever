import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { ReactionCounts } from '@/types';

// Must match EMOJIS array in ReactionBar.tsx — prevents arbitrary Unicode injection
const ALLOWED_EMOJIS = new Set(['❤️', '😍', '😂', '😢', '🎉', '🙏']);

/** Verifies that a memory_id exists (is a real memory in the DB). */
async function memoryExists(memoryId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .eq('id', memoryId);
  return (count ?? 0) > 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memoryId = searchParams.get('memory_id');

  if (!memoryId) {
    return NextResponse.json({ error: 'memory_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reactions')
    .select('emoji')
    .eq('memory_id', memoryId);

  if (error) return NextResponse.json({ error: 'Failed to load reactions' }, { status: 500 });

  // Aggregate into emoji → count map
  const counts: ReactionCounts = {};
  for (const { emoji } of data ?? []) {
    counts[emoji] = (counts[emoji] ?? 0) + 1;
  }

  return NextResponse.json(counts);
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const { memory_id, emoji, session_id } = body as Record<string, unknown>;

  // Validate memory_id
  if (typeof memory_id !== 'string' || !memory_id.trim()) {
    return NextResponse.json({ error: 'memory_id is required' }, { status: 400 });
  }
  if (!(await memoryExists(memory_id))) {
    return NextResponse.json({ error: 'memory_id not found' }, { status: 404 });
  }

  // Validate emoji is from the allowed set
  if (typeof emoji !== 'string' || !ALLOWED_EMOJIS.has(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reactions')
    .insert({
      memory_id,
      emoji,
      ...(typeof session_id === 'string' ? { session_id } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('reactions').delete().eq('id', id);

  if (error) return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
