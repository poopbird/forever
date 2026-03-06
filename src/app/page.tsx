import { createClient } from '@/lib/supabase/server';
import CoverHero from '@/components/layout/CoverHero';
import Timeline from '@/components/timeline/Timeline';
import MemoryMap from '@/components/map/MemoryMap';
import type { Memory } from '@/types';

// Always fetch fresh data — fine for a POC with no CDN caching
export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load memories:', error.message);
  }

  const memories: Memory[] = data ?? [];
  const mappable = memories.filter((m) => m.show_on_map && m.lat != null && m.lng != null);

  return (
    <main>
      <CoverHero />

      <section id="timeline" className="py-20 px-4 max-w-4xl mx-auto">
        <h2 className="font-serif text-4xl text-center text-rose-deep mb-14 tracking-tight">
          Our Story
        </h2>
        <Timeline memories={memories} />
      </section>

      {mappable.length > 0 && (
        <section id="map" className="py-20 bg-cream-dark">
          <h2 className="font-serif text-4xl text-center text-rose-deep mb-10 tracking-tight">
            Places We've Been
          </h2>
          <MemoryMap memories={mappable} />
        </section>
      )}
    </main>
  );
}
