import { createAdminClient } from './supabase/admin';

export interface CoupleProfile {
  id: string;
  name: string;
  start_date: string | null;
  bio: string | null;
  cover_photo_url: string | null;
  cover_video_url: string | null;
  wedding_date: string | null;
  wedding_venue: string | null;
  wedding_city: string | null;
}

/** Returns the couple_id for a given auth user, or null if they have no couple. */
export async function getCoupleId(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .single();
  return data?.couple_id ?? null;
}

/** Returns the full couple profile for a given couple_id. */
export async function getCoupleProfile(coupleId: string): Promise<CoupleProfile | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('couples')
    .select('id, name, start_date, bio, cover_photo_url, cover_video_url, wedding_date, wedding_venue, wedding_city')
    .eq('id', coupleId)
    .single();
  return data ?? null;
}

/**
 * Resolves both couple_id and profile for the current user.
 * Returns null for both if the user has no couple yet.
 */
export async function getCoupleForUser(
  userId: string,
): Promise<{ coupleId: string; profile: CoupleProfile } | null> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) return null;
  const profile = await getCoupleProfile(coupleId);
  if (!profile) return null;
  return { coupleId, profile };
}
