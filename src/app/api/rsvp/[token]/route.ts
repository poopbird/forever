import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const GUEST_FIELDS = new Set([
  'rsvp_status', 'plus_one_attending', 'plus_one_name',
  'dietary_preset', 'dietary_notes',
  'plus_one_dietary_preset', 'plus_one_dietary_notes',
  'email',
]);

/** GET /api/rsvp/[token] — public; returns the guest record + couple basics */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: guest, error } = await admin
    .from('rsvp_guests')
    .select('*, couples(name, wedding_date, wedding_venue, wedding_city, rsvp_enabled, rsvp_locked_at)')
    .eq('token', token)
    .single();

  if (error || !guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(guest);
}

/** PATCH /api/rsvp/[token] — public; guest submits / updates their RSVP */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  // 10 submissions per token per hour — prevents RSVP spam
  const ip = getClientIp(request);
  const { token } = await params;
  if (!checkRateLimit(`rsvp-submit:${token}:${ip}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const admin = createAdminClient();

  // Fetch the guest + couple lock date
  const { data: guest, error: fetchErr } = await admin
    .from('rsvp_guests')
    .select('id, couple_id, couples(rsvp_enabled, rsvp_locked_at)')
    .eq('token', token)
    .single();

  if (fetchErr || !guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const couple = (guest as Record<string, unknown>).couples as {
    rsvp_enabled: boolean;
    rsvp_locked_at: string | null;
  } | null;

  if (!couple?.rsvp_enabled) {
    return NextResponse.json({ error: 'RSVP is not open' }, { status: 403 });
  }

  if (couple.rsvp_locked_at) {
    const lockDate = new Date(couple.rsvp_locked_at);
    lockDate.setHours(23, 59, 59, 999); // end of lock day
    if (new Date() > lockDate) {
      return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const sanitised = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => GUEST_FIELDS.has(k)),
  );

  if (Object.keys(sanitised).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('rsvp_guests')
    .update({ ...sanitised, responded_at: new Date().toISOString() })
    .eq('token', token)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
