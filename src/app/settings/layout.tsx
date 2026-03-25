import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser } from '@/lib/couple';
import { redirect } from 'next/navigation';
import SettingsSidebar from './SettingsSidebar';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-sans text-[11px] tracking-[0.4em] uppercase mb-1"
              style={{ color: '#C9964A' }}>✦ Settings</p>
            <h1 className="font-serif text-3xl text-ink">Your space</h1>
          </div>
          <a href="/" className="btn-ghost text-sm">← Back</a>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:gap-8 items-start">
          {/* Sidebar */}
          <SettingsSidebar />

          {/* Page content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
