import { createAdminClient } from '@/lib/supabase/admin';
import LookupForm from './LookupForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ couple_id?: string }>;
}

export default async function RsvpLookupPage({ searchParams }: Props) {
  const { couple_id } = await searchParams;

  let rsvpEnabled = true;
  let rsvpLockedAt: string | null = null;

  if (couple_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('couples')
      .select('rsvp_enabled, rsvp_locked_at')
      .eq('id', couple_id)
      .single();
    if (data) {
      rsvpEnabled  = data.rsvp_enabled  ?? false;
      rsvpLockedAt = data.rsvp_locked_at ?? null;
    }
  }

  return (
    <main
      style={{ background: '#0d0b08', minHeight: '100vh' }}
      className="flex flex-col items-center justify-start py-16 px-4"
    >
      <div className="text-center mb-10">
        <p
          className="font-mono uppercase tracking-[0.45em]"
          style={{ fontSize: 10, color: 'rgba(201,150,74,0.5)', marginBottom: 10 }}
        >
          RSVP Lookup
        </p>
        <h1
          className="font-serif"
          style={{ fontSize: 32, color: 'rgba(232,213,176,0.92)', letterSpacing: '-0.01em' }}
        >
          Find your invitation
        </h1>
        <p className="font-mono mt-3 text-xs" style={{ color: 'rgba(201,150,74,0.5)' }}>
          Enter your email address or phone number to find your RSVP link
        </p>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border:     '1px solid rgba(201,150,74,0.18)',
        }}
      >
        {!couple_id ? (
          <p className="text-center font-mono text-xs" style={{ color: 'rgba(201,150,74,0.5)' }}>
            Invalid link. Please check the URL you received.
          </p>
        ) : !rsvpEnabled ? (
          <div className="text-center flex flex-col gap-2">
            <p className="font-mono text-sm" style={{ color: 'rgba(201,150,74,0.6)' }}>
              RSVP is not open yet. Check back soon.
            </p>
            {rsvpLockedAt && (
              <p className="font-mono text-xs" style={{ color: 'rgba(201,150,74,0.4)' }}>
                Deadline to respond:{' '}
                {new Date(rsvpLockedAt + 'T00:00:00').toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : (
          <LookupForm coupleId={couple_id} />
        )}
      </div>
    </main>
  );
}
