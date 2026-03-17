import { createClient } from '@/lib/supabase/server';
import { getCoupleForUser } from '@/lib/couple';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import CoverHero from '@/components/layout/CoverHero';
import LandingSection from '@/components/layout/LandingSection';
import PolaroidHighlights from '@/components/highlights/PolaroidHighlights';
import FilmReel from '@/components/timeline/FilmReel';
import MemoryMap from '@/components/map/MemoryMap';
import FaqPreview from '@/components/faq/FaqPreview';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import type { Memory } from '@/types';
import type { FaqItem } from '@/components/faq/FaqAccordion';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware handles the redirect for unauthenticated users,
  // but guard here as well for safety.
  if (!user) redirect('/auth/login');

  const couple = await getCoupleForUser(user.id);

  // New user — no couple yet (e.g. if they somehow skipped /api/couples POST)
  if (!couple) redirect('/setup');

  const { coupleId, profile } = couple;

  const adminSupabase = createAdminClient();

  // Fetch memories, highlights and FAQs in parallel
  const [{ data, error }, { data: highlightRows }, { data: faqRows }] = await Promise.all([
    adminSupabase
      .from('memories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: true }),
    adminSupabase
      .from('couple_highlights')
      .select('position, memory:memories(*)')
      .eq('couple_id', coupleId)
      .order('position', { ascending: true }),
    adminSupabase
      .from('faqs')
      .select('*')
      .eq('couple_id', coupleId)
      .order('position', { ascending: true }),
  ]);

  if (error) console.error('Failed to load memories:', error.message);

  const memories: Memory[] = data ?? [];
  const highlights: Memory[] = (highlightRows ?? [])
    .map((row: { position: number; memory: unknown }) => row.memory as Memory)
    .filter(Boolean);
  const mappable: Memory[]      = memories.filter(m => m.show_on_map && m.lat != null && m.lng != null);
  const allFaqs: FaqItem[]      = faqRows ?? [];
  const previewFaqs: FaqItem[]  = allFaqs.slice(0, 3);

  return (
    <main>
      {/* Top nav — visible only to the logged-in couple */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs
                     tracking-wide text-white/70 hover:text-white border border-white/20
                     hover:border-white/50 bg-black/20 hover:bg-black/35 backdrop-blur-sm
                     transition-all duration-200"
        >
          ⚙ Settings
        </Link>
        <LogoutButton variant="nav" />
      </div>

      <CoverHero
        videoUrl={profile.cover_video_url}
        coupleName={profile.name}
        startDate={profile.start_date ?? undefined}
        loveStory={profile.bio ?? undefined}
      />

      <LandingSection memories={memories} startDate={profile.start_date ?? undefined} />

      <PolaroidHighlights
        highlights={highlights}
        allMemories={memories}
        coupleName={profile.name}
        weddingDate={profile.wedding_date ?? null}
        weddingVenue={profile.wedding_venue ?? null}
        weddingCity={profile.wedding_city ?? null}
        coupleId={coupleId}
        rsvpEnabled={profile.rsvp_enabled ?? false}
      />

      <section id="timeline">
        <FilmReel memories={memories} />
      </section>

      {mappable.length > 0 && (
        <section id="map">
          <MemoryMap memories={mappable} />
        </section>
      )}

      {previewFaqs.length > 0 && (
        <FaqPreview
          faqs={previewFaqs}
          coupleId={coupleId}
          totalCount={allFaqs.length}
        />
      )}
    </main>
  );
}
