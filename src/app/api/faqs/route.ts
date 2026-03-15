import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

const DEFAULT_FAQS = [
  { category: 'The Day',       question: 'What is the dress code?',          answer: '', position: 0 },
  { category: 'The Day',       question: 'What time should guests arrive?',   answer: '', position: 1 },
  { category: 'Venue',         question: 'Where is the ceremony / reception?', answer: '', position: 2 },
  { category: 'Venue',         question: 'Is there parking available?',        answer: '', position: 3 },
  { category: 'Guests',        question: 'Are children welcome?',              answer: '', position: 4 },
  { category: 'Gifts',         question: 'Is there a gift registry?',          answer: '', position: 5 },
];

// ── GET /api/faqs?coupleId=xxx — public, no auth ──────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coupleId = searchParams.get('coupleId');
  if (!coupleId) return NextResponse.json({ error: 'coupleId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('faqs')
    .select('*')
    .eq('couple_id', coupleId)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── POST /api/faqs — add a single FAQ (authed) ────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const admin = createAdminClient();

  let body: { question?: string; answer?: string; category?: string; position?: number; seed?: boolean };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Seed default FAQs for a new couple
  if (body.seed) {
    const rows = DEFAULT_FAQS.map(f => ({ ...f, couple_id: coupleId }));
    const { data, error } = await admin.from('faqs').insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  const { question, answer = '', category, position = 0 } = body;
  if (!question?.trim()) return NextResponse.json({ error: 'question is required' }, { status: 400 });

  const { data, error } = await admin
    .from('faqs')
    .insert({ couple_id: coupleId, question: question.trim(), answer, category: category ?? null, position })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
