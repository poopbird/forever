import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

/** POST /api/invites — generate a new invite token for the current couple */
export async function POST() {
  const supabase      = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  // Each generate call creates a fresh token (old unused ones remain valid until accepted)
  const { data: invite, error } = await adminSupabase
    .from('invites')
    .insert({ couple_id: coupleId })
    .select('token')
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate invite' }, { status: 500 });
  }

  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const inviteUrl = `${siteUrl}/auth/invite/${invite.token}`;

  return NextResponse.json({ inviteUrl });
}
