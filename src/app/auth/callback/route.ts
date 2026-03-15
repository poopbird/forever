import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

/**
 * Supabase redirects here after email confirmation or OAuth.
 * Exchanges the one-time code for a session cookie, then routes the user:
 *   - invite_token present → join existing couple → home
 *   - new user, no couple → create couple → /setup
 *   - returning user      → next param (defaults to /)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code        = searchParams.get('code');
  const next        = searchParams.get('next') ?? '/';
  const inviteToken = searchParams.get('invite_token');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const adminSupabase = createAdminClient();

        // ── Invite flow: link this user to their partner's couple ──────────
        if (inviteToken) {
          const { data: invite } = await adminSupabase
            .from('invites')
            .select('id, couple_id, accepted')
            .eq('token', inviteToken)
            .single();

          if (invite && !invite.accepted) {
            const { count } = await adminSupabase
              .from('couple_members')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', invite.couple_id);

            if ((count ?? 0) < 2) {
              await adminSupabase
                .from('couple_members')
                .insert({ couple_id: invite.couple_id, user_id: user.id, role: 'partner' });
              await adminSupabase
                .from('invites')
                .update({ accepted: true })
                .eq('id', invite.id);
            }
          }

          return NextResponse.redirect(`${origin}/`);
        }

        // ── New OAuth user: create couple if they don't have one ───────────
        const coupleId = await getCoupleId(user.id);
        if (!coupleId) {
          const { data: couple } = await adminSupabase
            .from('couples')
            .insert({})
            .select()
            .single();

          if (couple) {
            await adminSupabase
              .from('couple_members')
              .insert({ couple_id: couple.id, user_id: user.id, role: 'owner' });
          }

          return NextResponse.redirect(`${origin}/setup`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=invalid_link`);
}
