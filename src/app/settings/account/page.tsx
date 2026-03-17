import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser } from '@/lib/couple';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-2">Account</h2>
        <p className="font-sans text-sm text-ink-light mb-2">
          Signed in as <span className="font-medium text-ink">{user.email}</span>
        </p>
        <p className="font-sans text-sm text-ink-light mb-6">
          Sign out from this device. Your space and memories will still be here when you return.
        </p>
        <LogoutButton variant="section" />
      </section>
    </div>
  );
}
