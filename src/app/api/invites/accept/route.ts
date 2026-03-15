import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/** POST /api/invites/accept  body: { token: string } — links the current user to the invite's couple */
export async function POST(request: Request) {
  const supabase      = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { token } = body as Record<string, unknown>;
  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  // Look up the invite
  const { data: invite, error: inviteErr } = await adminSupabase
    .from('invites')
    .select('id, couple_id, accepted')
    .eq('token', token)
    .single();

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 });
  }
  if (invite.accepted) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 409 });
  }

  // Check the couple doesn't already have 2 members
  const { count } = await adminSupabase
    .from('couple_members')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', invite.couple_id);

  if ((count ?? 0) >= 2) {
    return NextResponse.json({ error: 'This couple already has two members' }, { status: 409 });
  }

  // Add the new user as partner
  const { error: memberErr } = await adminSupabase
    .from('couple_members')
    .insert({ couple_id: invite.couple_id, user_id: user.id, role: 'partner' });

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  // Mark invite as accepted
  await adminSupabase.from('invites').update({ accepted: true }).eq('id', invite.id);

  return NextResponse.json({ ok: true });
}
