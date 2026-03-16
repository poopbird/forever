import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ReactionCounts } from '@/types';

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate into emoji → count map
  const counts: ReactionCounts = {};
  for (const { emoji } of data ?? []) {
    counts[emoji] = (counts[emoji] ?? 0) + 1;
  }

  return NextResponse.json(counts);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase.from('reactions').insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('reactions').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
