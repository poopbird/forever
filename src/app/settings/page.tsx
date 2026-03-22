import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleForUser } from '@/lib/couple';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const shareUrl = `${siteUrl}/view/${couple.coupleId}`;

  // Fetch photo memories for the invitation photo picker (newest first)
  const adminSb = createAdminClient();
  const { data: photoRows } = await adminSb
    .from('memories')
    .select('id, media_url, caption')
    .eq('couple_id', couple.coupleId)
    .not('media_url', 'is', null)
    .eq('media_type', 'photo')
    .order('date', { ascending: false });

  const photoMemories = (photoRows ?? []) as { id: string; media_url: string; caption: string }[];

  return (
    <ProfileClient
      profile={couple.profile}
      shareUrl={shareUrl}
      coupleId={couple.coupleId}
      siteUrl={siteUrl}
      photoMemories={photoMemories}
    />
  );
}
