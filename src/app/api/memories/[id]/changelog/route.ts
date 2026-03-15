import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify the memory belongs to the couple
  const { data: memory } = await admin
    .from('memories')
    .select('id')
    .eq('id', id)
    .eq('couple_id', coupleId)
    .single();

  if (!memory) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await admin
    .from('memory_changelog')
    .select('*')
    .eq('memory_id', id)
    .order('changed_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
