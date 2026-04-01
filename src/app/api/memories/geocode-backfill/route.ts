import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId }       from '@/lib/couple';
import { NextResponse }      from 'next/server';

/** Reverse-geocode a lat/lng to an ISO-3166-1 alpha-2 country code via Nominatim. */
async function resolveCountryCode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent':      'Forever-WeddingApp/1.0',
        },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) return null;
    const d = await res.json();
    return (d?.address?.country_code as string | undefined)?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

/** Sleep helper for Nominatim rate-limit compliance (1 req/s). */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * POST /api/memories/geocode-backfill
 *
 * Idempotent: resolves country_code for every memory that has lat/lng but
 * no country_code yet. Safe to call multiple times; once all memories are
 * coded it returns immediately.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return NextResponse.json({ error: 'No couple found' }, { status: 403 });

  const admin = createAdminClient();

  // Fetch memories that have coordinates but are missing country_code
  const { data: pending, error } = await admin
    .from('memories')
    .select('id, lat, lng')
    .eq('couple_id', coupleId)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .is('country_code', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ updated: 0, message: 'All memories already geocoded.' });
  }

  let updated = 0;

  for (const m of pending) {
    const code = await resolveCountryCode(m.lat as number, m.lng as number);
    if (code) {
      await admin.from('memories').update({ country_code: code }).eq('id', m.id);
      updated++;
    }
    // Nominatim policy: max 1 request per second
    await sleep(150);
  }

  return NextResponse.json({ updated, total: pending.length });
}
