import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser } from '@/lib/couple';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);
  if (!couple) redirect('/setup');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const shareUrl = `${siteUrl}/view/${couple.coupleId}`;

  return <SettingsClient profile={couple.profile} shareUrl={shareUrl} coupleId={couple.coupleId} />;
}
