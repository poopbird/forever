import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * GET /api/rsvp/lookup?couple_id=xxx&email=...&phone=...
 * Public endpoint — no auth required.
 * At least one of email or phone must be provided.
 * Returns matching guests so the guest can find their RSVP link.
 */
export async function GET(request: Request) {
  // 5 lookups per IP per minute — prevents guest list enumeration
  const ip = getClientIp(request);
  if (!checkRateLimit(`rsvp-lookup:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const coupleId = searchParams.get('couple_id');
  const email    = searchParams.get('email')?.trim() ?? '';
  const phone    = searchParams.get('phone')?.trim() ?? '';

  if (!coupleId)        return NextResponse.json({ error: 'couple_id is required' }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: 'email or phone is required' }, { status: 400 });

  const admin = createAdminClient();

  // Build OR filter for whichever fields were provided
  const filters: string[] = [];
  if (email) filters.push(`email.ilike.${email}`);
  if (phone) filters.push(`phone.ilike.${phone}`);

  const { data, error } = await admin
    .from('rsvp_guests')
    .select('id, name, email, phone, token, rsvp_status')
    .eq('couple_id', coupleId)
    .or(filters.join(','))
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
