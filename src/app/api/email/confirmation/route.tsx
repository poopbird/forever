import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import ConfirmationEmail from '@/emails/ConfirmationEmail';
import { googleCalendarLink } from '@/lib/calendarLink';

/** POST /api/email/confirmation — public; called from RSVP form after successful submit */
export async function POST(request: Request) {
  let body: { token: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { token } = body;
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const resend  = new Resend(process.env.RESEND_API_KEY);
  const admin   = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { data: guest } = await admin
    .from('rsvp_guests')
    .select('*, couples(id, name, wedding_date, wedding_time_start, wedding_time_end, wedding_venue, wedding_city, calendar_description)')
    .eq('token', token)
    .single();

  if (!guest?.email) return NextResponse.json({ ok: false, reason: 'no_email' });

  const couple = guest.couples as {
    id:                   string;
    name:                 string;
    wedding_date:         string | null;
    wedding_time_start:   string | null;
    wedding_time_end:     string | null;
    wedding_venue:        string | null;
    wedding_city:         string | null;
    calendar_description: string | null;
  } | null;

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 });

  const weddingDate = couple.wedding_date
    ? new Date(couple.wedding_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Build default description if couple hasn't set one
  const description = couple.calendar_description
    ?? `You're attending ${couple.name}'s wedding!\n\nBrowse our story: ${siteUrl}/view/${couple.id}`;

  const calendarLink = guest.rsvp_status === 'attending' && couple.wedding_date
    ? googleCalendarLink({
        title:       `${couple.name}'s Wedding`,
        date:        couple.wedding_date,
        timeStart:   couple.wedding_time_start,
        timeEnd:     couple.wedding_time_end,
        venue:       couple.wedding_venue,
        city:        couple.wedding_city,
        description,
      })
    : null;

  // .ics download link — served by /api/rsvp/calendar/[token]
  const icsLink = guest.rsvp_status === 'attending' && couple.wedding_date
    ? `${siteUrl}/api/rsvp/calendar/${token}`
    : null;

  const html = await render(
    <ConfirmationEmail
      coupleName={couple.name}
      guestName={guest.name}
      rsvpStatus={guest.rsvp_status as 'attending' | 'declined'}
      dietaryPreset={guest.dietary_preset}
      dietaryNotes={guest.dietary_notes}
      plusOneAttending={guest.plus_one_attending}
      plusOneName={guest.plus_one_name}
      plusOneDietary={guest.plus_one_dietary_preset}
      changeLink={`${siteUrl}/rsvp/${token}`}
      calendarLink={calendarLink}
      icsLink={icsLink}
      weddingDate={weddingDate}
      weddingVenue={couple.wedding_venue}
      weddingCity={couple.wedding_city}
    /> as React.ReactElement,
  );

  const { error } = await resend.emails.send({
    from:    `${couple.name} <onboarding@resend.dev>`,
    to:      guest.email,
    subject: `RSVP confirmed — ${couple.name}`,
    html,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
