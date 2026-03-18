import { createAdminClient } from '@/lib/supabase/admin';
import { icsContent }        from '@/lib/calendarLink';
import { NextResponse }      from 'next/server';

/** GET /api/rsvp/calendar/[token]
 *  Public — returns an .ics file for the guest's wedding calendar event.
 *  Works with Apple Calendar, Outlook, and any calendar app that supports iCal.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from('rsvp_guests')
    .select('id, name, rsvp_status, couples(name, wedding_date, wedding_time_start, wedding_time_end, wedding_venue, wedding_city, calendar_description)')
    .eq('token', token)
    .single();

  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (guest.rsvp_status !== 'attending') {
    return NextResponse.json({ error: 'Not attending' }, { status: 403 });
  }

  const couple = guest.couples as {
    name:                 string;
    wedding_date:         string | null;
    wedding_time_start:   string | null;
    wedding_time_end:     string | null;
    wedding_venue:        string | null;
    wedding_city:         string | null;
    calendar_description: string | null;
  } | null;

  if (!couple?.wedding_date) {
    return NextResponse.json({ error: 'No wedding date set' }, { status: 404 });
  }

  const ics = icsContent({
    title:       `${couple.name}'s Wedding`,
    date:        couple.wedding_date,
    timeStart:   couple.wedding_time_start,
    timeEnd:     couple.wedding_time_end,
    venue:       couple.wedding_venue,
    city:        couple.wedding_city,
    description: couple.calendar_description,
    uid:         guest.id,
  });

  return new Response(ics, {
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${couple.name.replace(/[^a-z0-9]/gi, '-')}-wedding.ics"`,
    },
  });
}
