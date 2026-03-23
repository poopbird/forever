import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { InvitationTheme } from '@/lib/couple';
import RsvpForm from './RsvpForm';
import RsvpPolaroidShell from './RsvpPolaroidShell';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function RsvpPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from('rsvp_guests')
    .select('*, couples(name, wedding_date, wedding_time_start, wedding_time_end, wedding_venue, wedding_city, rsvp_enabled, rsvp_locked_at, invitation_theme)')
    .eq('token', token)
    .single();

  if (!guest) notFound();

  const couple = guest.couples as {
    name: string;
    wedding_date: string | null;
    wedding_time_start: string | null;
    wedding_time_end: string | null;
    wedding_venue: string | null;
    wedding_city: string | null;
    rsvp_enabled: boolean;
    rsvp_locked_at: string | null;
    invitation_theme: InvitationTheme | null;
  } | null;

  const invitationTheme: InvitationTheme =
    (couple?.invitation_theme as InvitationTheme) ?? 'polaroid_white';

  const isLocked = couple?.rsvp_locked_at
    ? new Date() > new Date(new Date(couple.rsvp_locked_at).setHours(23, 59, 59, 999))
    : false;

  return (
    <main
      style={{ background: '#0d0b08', minHeight: '100vh' }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <RsvpPolaroidShell
        invitationTheme={invitationTheme}
        coupleName={couple?.name ?? 'Our Wedding'}
        weddingDate={couple?.wedding_date}
        weddingTimeStart={couple?.wedding_time_start}
        weddingTimeEnd={couple?.wedding_time_end}
        weddingVenue={couple?.wedding_venue}
        weddingCity={couple?.wedding_city}
      >
        {!couple?.rsvp_enabled ? (
          <div className="text-center flex flex-col gap-2 py-4">
            <p
              className="font-mono text-sm"
              style={{ color: 'rgba(201,150,74,0.6)' }}
            >
              RSVP is not open yet. Check back soon.
            </p>
            {couple?.rsvp_locked_at && (
              <p className="font-mono text-xs" style={{ color: 'rgba(201,150,74,0.4)' }}>
                Deadline to respond:{' '}
                {new Date(couple.rsvp_locked_at + 'T00:00:00').toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : isLocked ? (
          <p className="text-center font-mono text-sm py-4" style={{ color: 'rgba(201,150,74,0.6)' }}>
            The RSVP deadline has passed. Please contact the couple directly.
          </p>
        ) : (
          <RsvpForm guest={guest} invitationTheme={invitationTheme} />
        )}
      </RsvpPolaroidShell>
    </main>
  );
}
