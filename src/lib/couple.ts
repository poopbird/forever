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
  wedding_time_start: string | null;
  wedding_time_end: string | null;
  // RSVP fields — only present after migration 0010_rsvp.sql has been run
  rsvp_enabled?: boolean;
  rsvp_locked_at?: string | null;
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
    .select('id, name, start_date, bio, cover_photo_url, cover_video_url, wedding_date, wedding_venue, wedding_city, wedding_time_start, wedding_time_end')
    .eq('id', coupleId)
    .single();
  return data ?? null;
}

/**
 * Fetches RSVP-specific fields (requires migration 0010_rsvp.sql).
 * Called only from pages/components that use RSVP functionality.
 */
export async function getRsvpSettings(coupleId: string): Promise<{
  rsvp_enabled: boolean;
  rsvp_locked_at: string | null;
  reminder_days_before: number | null;
  invite_message_template: string | null;
  calendar_description: string | null;
} | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('couples')
    .select('rsvp_enabled, rsvp_locked_at, reminder_days_before, invite_message_template, calendar_description')
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
