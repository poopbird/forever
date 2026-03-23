import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser, getRsvpSettings } from '@/lib/couple';
import { redirect } from 'next/navigation';
import RsvpSection from '@/components/rsvp/RsvpSection';

export default async function RsvpSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  const rsvp = await getRsvpSettings(couple.coupleId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-2">RSVP</h2>
        <p className="font-sans text-sm text-ink-light mb-5">
          Manage your guest list, share personal RSVP links, and track responses.
        </p>
        <RsvpSection
          coupleId={couple.coupleId}
          rsvpEnabled={rsvp?.rsvp_enabled ?? false}
          rsvpLockedAt={rsvp?.rsvp_locked_at ?? null}
          reminderDaysBefore={rsvp?.reminder_days_before ?? null}
          inviteMessageTemplate={rsvp?.invite_message_template ?? null}
          calendarDescription={rsvp?.calendar_description ?? null}
          siteUrl={siteUrl}
          attendingPhotoUrl={rsvp?.rsvp_attending_photo_url ?? null}
          decliningPhotoUrl={rsvp?.rsvp_declining_photo_url ?? null}
        />
      </section>
    </div>
  );
}
