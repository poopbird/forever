'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface RsvpMapProps {
  lat:        number;
  lng:        number;
  venue?:     string | null;
  city?:      string | null;
  compact?:   boolean;  // 180px mobile vs 260px desktop
}

export default function RsvpMap({ lat, lng, venue, city, compact = false }: RsvpMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    (async () => {
      const L = (await import('leaflet')).default;

      if (!mounted || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = (L as any).map(containerRef.current, {
        center:             [lat, lng],
        zoom:               14,
        zoomControl:        false,
        attributionControl: false,
        scrollWheelZoom:    false,
        dragging:           true,
      });

      mapRef.current = map;

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(map);

      // Gold dot marker
      const icon = L.divIcon({
        html: `<div style="width:13px;height:13px;background:#c9964a;border:2.5px solid rgba(255,255,255,0.75);border-radius:50%;box-shadow:0 0 0 4px rgba(201,150,74,0.25),0 2px 8px rgba(0,0,0,0.55)"></div>`,
        className:  '',
        iconSize:   [13, 13],
        iconAnchor: [6, 6],
      });

      L.marker([lat, lng], { icon }).addTo(map);
    })();

    return () => {
      mounted = false;
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [venue, city].filter(Boolean).join(', ')
  )}`;

  return (
    <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
      {/* Map canvas */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: compact ? 180 : 260 }}
      />

      {/* Bottom gradient + address */}
      {(venue || city) && (
        <div
          style={{
            position:      'absolute',
            bottom:        0,
            left:          0,
            right:         0,
            background:    'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
            padding:       '36px 14px 10px',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              fontFamily:    '"DM Sans", sans-serif',
              fontStyle:     'italic',
              fontSize:      '0.64rem',
              color:         'rgba(255,255,255,0.68)',
              letterSpacing: '0.04em',
              margin:        0,
            }}
          >
            {[venue, city].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {/* View Directions button */}
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position:      'absolute',
          bottom:        10,
          right:         10,
          display:       'inline-flex',
          alignItems:    'center',
          gap:           5,
          padding:       '6px 12px',
          background:    'rgba(201,150,74,0.90)',
          backdropFilter:'blur(6px)',
          borderRadius:  4,
          fontFamily:    '"DM Sans", sans-serif',
          fontWeight:    500,
          fontSize:      '0.55rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         '#ffffff',
          textDecoration:'none',
          boxShadow:     '0 2px 10px rgba(0,0,0,0.40)',
        }}
      >
        View Directions ↗
      </a>
    </div>
  );
}
