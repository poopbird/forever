import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import RsvpForm from './RsvpForm';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function RsvpPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from('rsvp_guests')
    .select('*, couples(name, wedding_date, wedding_venue, wedding_city, rsvp_enabled, rsvp_locked_at)')
    .eq('token', token)
    .single();

  if (!guest) notFound();

  const couple = guest.couples as {
    name: string;
    wedding_date: string | null;
    wedding_venue: string | null;
    wedding_city: string | null;
    rsvp_enabled: boolean;
    rsvp_locked_at: string | null;
  } | null;

  const isLocked = couple?.rsvp_locked_at
    ? new Date() > new Date(new Date(couple.rsvp_locked_at).setHours(23, 59, 59, 999))
    : false;

  return (
    <main
      style={{ background: '#0d0b08', minHeight: '100vh' }}
      className="flex flex-col items-center justify-start py-16 px-4"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <p
          className="font-mono uppercase tracking-[0.45em]"
          style={{ fontSize: 10, color: 'rgba(201,150,74,0.5)', marginBottom: 10 }}
        >
          You&apos;re invited
        </p>
        <h1
          className="font-serif"
          style={{ fontSize: 36, color: 'rgba(232,213,176,0.92)', letterSpacing: '-0.01em' }}
        >
          {couple?.name ?? 'Our Wedding'}
        </h1>
        {(couple?.wedding_date || couple?.wedding_venue || couple?.wedding_city) && (
          <p
            className="font-mono mt-3"
            style={{ fontSize: 12, color: 'rgba(201,150,74,0.6)' }}
          >
            {[
              couple.wedding_date
                ? new Date(couple.wedding_date + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                : null,
              couple.wedding_venue,
              couple.wedding_city,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Form card */}
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background:   'rgba(255,255,255,0.03)',
          border:       '1px solid rgba(201,150,74,0.18)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {!couple?.rsvp_enabled ? (
          <div className="text-center flex flex-col gap-2">
            <p className="font-mono text-sm" style={{ color: 'rgba(201,150,74,0.6)' }}>
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
          <p className="text-center font-mono text-sm" style={{ color: 'rgba(201,150,74,0.6)' }}>
            The RSVP deadline has passed. Please contact the couple directly.
          </p>
        ) : (
          <RsvpForm guest={guest} />
        )}
      </div>
    </main>
  );
}
