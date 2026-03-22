import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const MAX_AUTHOR_LENGTH = 100;
const MAX_BODY_LENGTH   = 1000;

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

  const supabase = await createClient();
  let query = supabase.from('comments').select('*').order('created_at', { ascending: true });

  if (memoryId) query = query.eq('memory_id', memoryId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const { memory_id, author_name, body: commentBody } = body as Record<string, unknown>;

  // Validate memory_id
  if (typeof memory_id !== 'string' || !memory_id.trim()) {
    return NextResponse.json({ error: 'memory_id is required' }, { status: 400 });
  }
  if (!(await memoryExists(memory_id))) {
    return NextResponse.json({ error: 'memory_id not found' }, { status: 404 });
  }

  // Validate author_name
  if (typeof author_name !== 'string' || !author_name.trim()) {
    return NextResponse.json({ error: 'author_name is required' }, { status: 400 });
  }

  // Validate comment body
  if (typeof commentBody !== 'string' || !commentBody.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .insert({
      memory_id,
      author_name: author_name.trim().slice(0, MAX_AUTHOR_LENGTH),
      body: commentBody.trim().slice(0, MAX_BODY_LENGTH),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  let parsed: unknown;
  try { parsed = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { body } = parsed as Record<string, unknown>;
  if (typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .update({ body: body.trim().slice(0, MAX_BODY_LENGTH) })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('comments').delete().eq('id', id);

  if (error) return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
