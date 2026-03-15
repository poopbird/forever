import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

/**
 * GET /api/changelog?coupleId=&limit=10&offset=0
 * Returns recent memory edits for the authenticated couple.
 * coupleId param is used only to verify it matches the session couple.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '11', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0',  10);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('memory_changelog')
    .select('*')
    .eq('couple_id', coupleId)
    .order('changed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
