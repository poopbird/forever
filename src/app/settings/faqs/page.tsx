import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser } from '@/lib/couple';
import { redirect } from 'next/navigation';
import FaqEditor from '@/components/faq/FaqEditor';

export default async function FaqsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-2">Wedding FAQs</h2>
        <p className="font-sans text-sm text-ink-light mb-5">
          These appear on your public FAQ page. Guests can read them — only you can edit them.
        </p>
        <FaqEditor coupleId={couple.coupleId} />
      </section>
    </div>
  );
}
