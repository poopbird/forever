import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser } from '@/lib/couple';
import { redirect } from 'next/navigation';
import ChangelogSection from '@/components/memory/ChangelogSection';

export default async function HistorySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-2">Edit history</h2>
        <p className="font-sans text-sm text-ink-light mb-5">
          A log of all changes made to your memories.
        </p>
        <ChangelogSection coupleId={couple.coupleId} />
      </section>
    </div>
  );
}
