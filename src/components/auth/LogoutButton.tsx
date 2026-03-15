'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  /** 'nav' = small ghost pill (for the home page top bar)
   *  'section' = full-width destructive button (for the settings page) */
  variant?: 'nav' | 'section';
}

export default function LogoutButton({ variant = 'nav' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  if (variant === 'nav') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs
                   tracking-wide text-white/60 hover:text-white border border-white/15
                   hover:border-white/40 bg-black/15 hover:bg-black/30 backdrop-blur-sm
                   transition-all duration-200 disabled:opacity-50"
      >
        {loading ? '…' : 'Sign out'}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-xl font-sans text-sm font-medium
                 border border-rose-deep/30 text-rose-deep hover:bg-rose-deep/5
                 transition-colors duration-150 disabled:opacity-50"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
