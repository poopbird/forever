import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import InviteEmail from '@/emails/InviteEmail';

function substituteVars(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
    template,
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  let body: { guestIds: string[] };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { guestIds } = body;
  if (!Array.isArray(guestIds) || guestIds.length === 0) {
    return NextResponse.json({ error: 'guestIds required' }, { status: 400 });
  }

  const resend  = new Resend(process.env.RESEND_API_KEY);
  const admin   = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Fetch couple profile
  const { data: couple } = await admin
    .from('couples')
    .select('name, wedding_date, wedding_venue, wedding_city, rsvp_locked_at, invite_message_template')
    .eq('id', coupleId)
    .single();

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 });

  // Fetch guests (only those belonging to this couple)
  const { data: guests } = await admin
    .from('rsvp_guests')
    .select('id, name, email, token, invite_sent_at')
    .eq('couple_id', coupleId)
    .in('id', guestIds);

  if (!guests?.length) return NextResponse.json({ error: 'No guests found' }, { status: 404 });

  const foreverLink = `${siteUrl}/view/${coupleId}`;
  const deadline    = couple.rsvp_locked_at
    ? new Date(couple.rsvp_locked_at + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const weddingDate = couple.wedding_date
    ? new Date(couple.wedding_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const results = await Promise.allSettled(
    guests
      .filter(g => !!g.email)
      .map(async g => {
        const rsvpLink   = `${siteUrl}/rsvp/${g.token}`;
        const customBody = couple.invite_message_template
          ? substituteVars(couple.invite_message_template, {
              guest_name:   g.name,
              rsvp_link:    rsvpLink,
              forever_link: foreverLink,
              wedding_date: weddingDate ?? '',
              deadline:     deadline ?? '',
            })
          : null;

        const html = await render(
          <InviteEmail
            coupleName={couple.name}
            guestName={g.name}
            rsvpLink={rsvpLink}
            foreverLink={foreverLink}
            weddingDate={weddingDate}
            weddingVenue={couple.wedding_venue}
            weddingCity={couple.wedding_city}
            deadline={deadline}
            customBody={customBody}
          /> as React.ReactElement,
        );

        await resend.emails.send({
          from:    `${couple.name} <noreply@foowengs.com>`,
          to:      g.email!,
          subject: `You're invited — ${couple.name}`,
          html,
        });

        // Update invite_sent_at
        await admin
          .from('rsvp_guests')
          .update({ invite_sent_at: new Date().toISOString() })
          .eq('id', g.id);

        return g.id;
      }),
  );

  const sent    = results.filter(r => r.status === 'fulfilled').length;
  const skipped = guests.filter(g => !g.email).length;
  const failed  = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ sent, skipped, failed });
}
