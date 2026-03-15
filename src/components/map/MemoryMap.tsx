'use client';

import dynamic from 'next/dynamic';
import type { Memory } from '@/types';

// Leaflet is browser-only
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 520, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.8rem', color: 'rgba(201,150,74,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Loading map…
      </p>
    </div>
  ),
});

// ─── Stat ribbon helpers ───────────────────────────────────────────────────────
function uniqueCount<T>(arr: T[]): number {
  return new Set(arr).size;
}

function getContinentFromLat(lat: number, lng: number): string {
  // Rough bounding-box heuristic — good enough for stat ribbon
  if (lat > 35 && lng > -30  && lng < 65)  return 'Europe';
  if (lat < 35 && lat > -38  && lng > -20 && lng < 55) return 'Africa';
  if (lat > 5  && lng > 25   && lng < 180) return 'Asia';
  if (lat < 5  && lat > -55  && lng > 100) return 'Oceania';
  if (lat > 10 && lng > -170 && lng < -30) return 'North America';
  if (lat < 10 && lat > -60  && lng > -90 && lng < -30) return 'South America';
  return 'Unknown';
}

interface MemoryMapProps {
  memories: Memory[];
}

export default function MemoryMap({ memories }: MemoryMapProps) {
  const geoMemories = memories.filter(m => m.lat != null && m.lng != null);

  // Location names for city count (unique non-null location_names)
  const cities     = uniqueCount(geoMemories.map(m => m.location_name).filter(Boolean));
  const continents = uniqueCount(geoMemories.map(m => getContinentFromLat(m.lat!, m.lng!)).filter(c => c !== 'Unknown'));

  // We don't have country codes here without an API call, so approximate with
  // location_name groups at a high level — if you have country data, swap this.
  // For now we show cities + continents; countries shown when MapInner resolves them.
  const stats = [
    { value: continents, label: continents === 1 ? 'continent' : 'continents' },
    { value: cities || geoMemories.length, label: cities ? (cities === 1 ? 'city' : 'cities') : (geoMemories.length === 1 ? 'memory' : 'memories') },
    { value: geoMemories.length, label: geoMemories.length === 1 ? 'pin' : 'pins' },
  ].filter(s => s.value > 0);

  return (
    <div style={{ background: '#111118', padding: '60px 0 0' }}>
      {/* ── Section heading ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{
          fontFamily:    '"Lato", sans-serif',
          fontSize:      '0.62rem',
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color:         'rgba(201,150,74,0.55)',
          marginBottom:  14,
        }}>
          ✦ &nbsp; Places We&apos;ve Been &nbsp; ✦
        </p>
        <h2 style={{
          fontFamily:    '"Playfair Display", Georgia, serif',
          fontSize:      'clamp(2rem, 4vw, 3rem)',
          fontStyle:     'italic',
          fontWeight:    700,
          color:         'rgba(253,248,240,0.92)',
          margin:        0,
        }}>
          Our Adventures Together
        </h2>
      </div>

      {/* ── Stat ribbon ── */}
      {stats.length > 0 && (
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          gap:            0,
          marginBottom:   32,
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 32px' }}>
                <p style={{
                  fontFamily:    '"Playfair Display", serif',
                  fontSize:      'clamp(2rem, 4vw, 3rem)',
                  fontWeight:    700,
                  color:         'rgba(232,201,123,0.95)',
                  lineHeight:    1,
                  margin:        0,
                }}>
                  {s.value}
                </p>
                <p style={{
                  fontFamily:    '"Lato", sans-serif',
                  fontSize:      '0.68rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color:         'rgba(255,255,255,0.35)',
                  marginTop:     6,
                }}>
                  {s.label}
                </p>
              </div>
              {i < stats.length - 1 && (
                <div style={{ width: 1, height: 40, background: 'rgba(201,150,74,0.2)' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Map ── */}
      <div style={{ overflow: 'hidden' }}>
        <MapInner memories={memories} />
      </div>
    </div>
  );
}
