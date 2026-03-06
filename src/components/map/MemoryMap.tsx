'use client';

import dynamic from 'next/dynamic';
import type { Memory } from '@/types';

// Leaflet is browser-only — must be loaded client-side with SSR disabled
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center bg-cream-dark rounded-2xl mx-4">
      <p className="text-ink-light font-sans text-sm animate-pulse">Loading map…</p>
    </div>
  ),
});

interface MemoryMapProps {
  memories: Memory[];
}

export default function MemoryMap({ memories }: MemoryMapProps) {
  return (
    <div className="max-w-5xl mx-auto px-4">
      <MapInner memories={memories} />
    </div>
  );
}
