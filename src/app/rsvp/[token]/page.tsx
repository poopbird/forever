import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { InvitationTheme } from '@/lib/couple';
import RsvpForm from './RsvpForm';
import RsvpPageLayout from './RsvpPageLayout';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

/** Nominatim forward-geocode. Returns [lat, lng] or null on failure. */
async function geocodeVenue(
  venue: string | null,
  city: string | null,
): Promise<[number, number] | null> {
  const query = [venue, city].filter(Boolean).join(', ');
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Forever Wedding App' } },
    );
    if (!res.ok) return null;
    const data: { lat: string; lon: string }[] = await res.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    /* silently skip map */
  }
  return null;
}

export default async function RsvpPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from('rsvp_guests')
    .select(
      '*, couples(name, wedding_date, wedding_time_start, wedding_time_end, wedding_venue, wedding_city, rsvp_enabled, rsvp_locked_at, invitation_theme, invitation_photo_url, rsvp_attending_photo_url, rsvp_declining_photo_url)',
    )
    .eq('token', token)
    .single();

  if (!guest) notFound();

  const couple = guest.couples as {
    name:                     string;
    wedding_date:             string | null;
    wedding_time_start:       string | null;
    wedding_time_end:         string | null;
    wedding_venue:            string | null;
    wedding_city:             string | null;
    rsvp_enabled:             boolean;
    rsvp_locked_at:           string | null;
    invitation_theme:         InvitationTheme | null;
    invitation_photo_url:     string | null;
    rsvp_attending_photo_url: string | null;
    rsvp_declining_photo_url: string | null;
  } | null;

  const invitationTheme: InvitationTheme =
    (couple?.invitation_theme as InvitationTheme) ?? 'polaroid_white';

  const isLocked = couple?.rsvp_locked_at
    ? new Date() > new Date(new Date(couple.rsvp_locked_at).setHours(23, 59, 59, 999))
    : false;

  // Geocode venue for map (best-effort; null = no map shown)
  const venueLatLng = await geocodeVenue(
    couple?.wedding_venue ?? null,
    couple?.wedding_city ?? null,
  );

  // Determine accent colour for status messages
  const isLight = invitationTheme === 'polaroid_white';
  const accentColor  = isLight ? 'rgba(160,110,50,0.70)' : 'rgba(201,150,74,0.65)';
  const subtleColor  = isLight ? 'rgba(0,0,0,0.42)'      : 'rgba(201,150,74,0.42)';

  return (
    <RsvpPageLayout
      invitationTheme={invitationTheme}
      coupleName={couple?.name ?? 'Our Wedding'}
      guestName={guest.name}
      weddingDate={couple?.wedding_date}
      weddingTimeStart={couple?.wedding_time_start}
      weddingTimeEnd={couple?.wedding_time_end}
      weddingVenue={couple?.wedding_venue}
      weddingCity={couple?.wedding_city}
      rsvpLockedAt={couple?.rsvp_locked_at}
      venueLatLng={venueLatLng}
    >
      {!couple?.rsvp_enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.78rem', color: accentColor }}>
            RSVP is not open yet. Check back soon.
          </p>
          {couple?.rsvp_locked_at && (
            <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.66rem', color: subtleColor }}>
              Deadline to respond:{' '}
              {new Date(couple.rsvp_locked_at + 'T00:00:00').toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
      ) : isLocked ? (
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.78rem', color: accentColor }}>
          The RSVP deadline has passed. Please contact the couple directly.
        </p>
      ) : (
        <RsvpForm
          guest={guest}
          invitationTheme={invitationTheme}
          attendingPhotoUrl={couple?.rsvp_attending_photo_url ?? null}
          decliningPhotoUrl={couple?.rsvp_declining_photo_url ?? null}
        />
      )}
    </RsvpPageLayout>
  );
}
