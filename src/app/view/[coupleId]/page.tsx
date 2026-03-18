import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import CoverHero from '@/components/layout/CoverHero';
import LandingSection from '@/components/layout/LandingSection';
import PolaroidHighlights from '@/components/highlights/PolaroidHighlights';
import FilmReel from '@/components/timeline/FilmReel';
import MemoryMap from '@/components/map/MemoryMap';
import KioskMode from '@/components/kiosk/KioskMode';
import FaqPreview from '@/components/faq/FaqPreview';
import type { Memory } from '@/types';
import type { FaqItem } from '@/components/faq/FaqAccordion';

export const revalidate = 60; // revalidate guest view every 60s

type Params = {
  params: Promise<{ coupleId: string }>;
  searchParams: Promise<{ kiosk?: string }>;
};

export default async function PublicView({ params, searchParams }: Params) {
  const { coupleId } = await params;
  const { kiosk } = await searchParams;
  const supabase = createAdminClient();

  // Fetch couple profile
  const { data: couple } = await supabase
    .from('couples')
    .select('id, name, start_date, bio, cover_photo_url, cover_video_url, wedding_date, wedding_time_start, wedding_time_end, wedding_venue, wedding_city, rsvp_enabled')
    .eq('id', coupleId)
    .single();

  if (!couple) notFound();

  // Fetch memories, highlights and FAQs in parallel
  const [{ data }, { data: highlightRows }, { data: faqRows }] = await Promise.all([
    supabase
      .from('memories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: true }),
    supabase
      .from('couple_highlights')
      .select('position, memory:memories(*)')
      .eq('couple_id', coupleId)
      .order('position', { ascending: true }),
    supabase
      .from('faqs')
      .select('*')
      .eq('couple_id', coupleId)
      .order('position', { ascending: true }),
  ]);

  const memories: Memory[] = data ?? [];
  const highlights: Memory[] = (highlightRows ?? [])
    .map((row: { position: number; memory: unknown }) => row.memory as Memory)
    .filter(Boolean);
  const allFaqs: FaqItem[]    = faqRows ?? [];
  const previewFaqs: FaqItem[] = allFaqs.slice(0, 3);

  // ── Kiosk / Presentation Mode ──────────────────────────────────────────────
  // Activated via ?kiosk=true — designed for projector display at a wedding
  if (kiosk === 'true') {
    return <KioskMode memories={memories} coupleName={couple.name} coupleId={coupleId} />;
  }

  // ── Normal guest view ──────────────────────────────────────────────────────
  const mappable = memories.filter(m => m.show_on_map && m.lat != null && m.lng != null);
  const hasPhotos = memories.some(m => m.media_type === 'photo' && m.media_url);

  return (
    <main>
      <CoverHero
        videoUrl={couple.cover_video_url}
        coupleName={couple.name}
        startDate={couple.start_date ?? undefined}
        loveStory={couple.bio ?? undefined}
        readOnly
      />

      <LandingSection memories={memories} startDate={couple.start_date ?? undefined} />

      <PolaroidHighlights
        highlights={highlights}
        allMemories={memories}
        coupleName={couple.name}
        weddingDate={couple.wedding_date ?? null}
        weddingTimeStart={couple.wedding_time_start ?? null}
        weddingTimeEnd={couple.wedding_time_end ?? null}
        weddingVenue={couple.wedding_venue ?? null}
        weddingCity={couple.wedding_city ?? null}
        readOnly
        coupleId={coupleId}
        rsvpEnabled={couple.rsvp_enabled ?? false}
      />

      <section id="timeline">
        <FilmReel memories={memories} readOnly />
      </section>

      {mappable.length > 0 && (
        <section id="map">
          <MemoryMap memories={mappable} />
        </section>
      )}

      {/* ── FAQ preview ── */}
      {previewFaqs.length > 0 && (
        <FaqPreview
          faqs={previewFaqs}
          coupleId={coupleId}
          totalCount={allFaqs.length}
        />
      )}

      {/* ── Footer actions ── */}
      <div className="py-16 flex flex-wrap justify-center gap-4 bg-cream-dark">
        {/* Wedding Day Info / FAQ */}
        <a
          href={`/view/${coupleId}/faq`}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full
                     font-sans text-sm font-semibold tracking-wide
                     border border-rose-deep text-rose-deep hover:bg-rose-deep hover:text-white
                     shadow-sm hover:shadow-lg transition-all duration-200"
        >
          <span>💌</span>
          Wedding Day Info
        </a>

        {/* Kiosk / Slideshow */}
        {hasPhotos && (
          <a
            href={`?kiosk=true`}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full
                       font-sans text-sm font-semibold tracking-wide
                       bg-rose-deep text-white hover:bg-rose-medium
                       shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <span>🎬</span>
            Start Slideshow
          </a>
        )}
      </div>
    </main>
  );
}
