'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Memory } from '@/types';

interface MapInnerProps {
  memories: Memory[];
}

export default function MapInner({ memories }: MapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState<Memory | null>(null);

  useEffect(() => {
    if (!containerRef.current || memories.length === 0) return;

    let map: import('leaflet').Map;

    (async () => {
      const L = (await import('leaflet')).default;

      // Fix broken default icon paths caused by webpack asset hashing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Guard against React StrictMode double-mount
      if (containerRef.current!.children.length > 0) return;

      map = L.map(containerRef.current!).setView([20, 0], 2);

      // CARTO Positron — minimal, cream-toned, English labels, no API key required
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors ' +
          '© <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const markers = memories
        .filter((m) => m.lat != null && m.lng != null)
        .map((m) => {
          const marker = L.marker([m.lat!, m.lng!]);
          marker.on('click', () => setPeek(m));
          return marker;
        });

      const group = L.featureGroup(markers).addTo(map);
      map.fitBounds(group.getBounds().pad(0.3));
    })();

    return () => {
      map?.remove();
    };
  }, [memories]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg isolate">
      <div ref={containerRef} className="h-[500px] w-full" />

      {/* Quick-peek card on pin click */}
      {peek && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]
                     bg-white rounded-2xl shadow-xl px-4 py-3 max-w-xs w-full"
        >
          <button
            onClick={() => setPeek(null)}
            aria-label="Close"
            className="absolute top-2 right-3 text-ink-light hover:text-ink text-sm"
          >
            ✕
          </button>
          <p className="font-serif text-sm text-ink line-clamp-2 pr-4">{peek.caption}</p>
          {peek.location_name && (
            <p className="text-xs text-ink-light mt-1">📍 {peek.location_name}</p>
          )}
        </div>
      )}
    </div>
  );
}
