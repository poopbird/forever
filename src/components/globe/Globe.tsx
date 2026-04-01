'use client';

import dynamic        from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { motion }     from 'framer-motion';
import type { Memory } from '@/types';
import type { InvitationTheme } from '@/lib/couple';

// Lazy-load the heavy Three.js scene only when the section scrolls into view
const GlobeInner = dynamic(() => import('./GlobeInner'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '80vw', maxHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{
        fontFamily:    '"Lato", sans-serif',
        fontSize:      '0.72rem',
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        color:         'rgba(180,155,100,0.5)',
      }}>
        Loading globe…
      </p>
    </div>
  ),
});

// ── Theme palette ──────────────────────────────────────────────────────────────
export const GLOBE_THEME = {
  polaroid_white: {
    bg:            '#1c1810',
    statLabel:     'rgba(180,155,100,0.55)',
    statValue:     'rgba(232,210,160,0.92)',
    statDivider:   'rgba(180,155,100,0.25)',
    countUpColor:  '#e8d2a0',
  },
  garden_bloom: {
    bg:            '#121510',
    statLabel:     'rgba(160,120,100,0.55)',
    statValue:     'rgba(210,170,140,0.92)',
    statDivider:   'rgba(160,120,100,0.25)',
    countUpColor:  '#d2aa8c',
  },
  sage_linen: {
    bg:            '#111410',
    statLabel:     'rgba(130,150,120,0.55)',
    statValue:     'rgba(180,200,160,0.92)',
    statDivider:   'rgba(130,150,120,0.25)',
    countUpColor:  '#b4c8a0',
  },
  midnight_indigo: {
    bg:            '#060810',
    statLabel:     'rgba(120,140,200,0.5)',
    statValue:     'rgba(180,200,240,0.92)',
    statDivider:   'rgba(120,140,200,0.2)',
    countUpColor:  '#b4c8f0',
  },
} as const;

// ── Animated count-up ──────────────────────────────────────────────────────────
function CountUp({ target, color }: { target: number; color: string }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    const duration = 1200;
    const start    = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.round(t * target));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target]);

  return (
    <span style={{
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize:   'clamp(2.4rem, 4.5vw, 3.4rem)',
      fontWeight: 700,
      color,
      lineHeight: 1,
    }}>
      {val}
    </span>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface GlobeProps {
  memories:         Memory[];
  invitationTheme?: InvitationTheme | null;
  coupleId?:        string;  // used to trigger backfill
}

export default function Globe({ memories, invitationTheme, coupleId }: GlobeProps) {
  const theme        = GLOBE_THEME[invitationTheme ?? 'polaroid_white'];
  const sectionRef   = useRef<HTMLDivElement>(null);
  const [visible,  setVisible]  = useState(false);
  const [statsIn,  setStatsIn]  = useState(false);
  const backfillFired = useRef(false);

  // Intersection observer — mount the heavy globe only when visible
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          setTimeout(() => setStatsIn(true), 400);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fire backfill once on first visible load
  useEffect(() => {
    if (!visible || backfillFired.current || !coupleId) return;
    backfillFired.current = true;
    fetch('/api/memories/geocode-backfill', { method: 'POST' }).catch(() => null);
  }, [visible, coupleId]);

  // Stats: unique countries + unique cities from memories with geo data
  const geoMemories  = memories.filter(m => m.lat != null && m.lng != null);
  const countryCount = new Set(
    memories.map(m => (m as unknown as Record<string, unknown>).country_code as string)
      .filter(Boolean)
  ).size;
  const cityCount    = new Set(
    geoMemories.map(m => m.location_name).filter(Boolean)
  ).size;

  return (
    <section
      ref={sectionRef}
      style={{
        background:    theme.bg,
        width:         '100%',
        minHeight:     '100svh',
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'center',
        overflow:      'hidden',
      }}
    >
      {/* ── Stat ribbon ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={statsIn ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display:        'flex',
          justifyContent: 'center',
          alignItems:     'center',
          gap:            0,
          padding:        'clamp(24px, 4vh, 48px) 0 clamp(16px, 2.5vh, 32px)',
        }}
      >
        {/* Countries */}
        {countryCount > 0 && (
          <div style={{ textAlign: 'center', padding: '0 40px' }}>
            {statsIn && <CountUp target={countryCount} color={theme.countUpColor} />}
            <p style={{
              fontFamily:    '"Lato", sans-serif',
              fontSize:      '0.68rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color:         theme.statLabel,
              marginTop:     8,
            }}>
              {countryCount === 1 ? 'country' : 'countries'}
            </p>
          </div>
        )}

        {countryCount > 0 && cityCount > 0 && (
          <div style={{ width: 1, height: 44, background: theme.statDivider }} />
        )}

        {/* Cities */}
        {cityCount > 0 && (
          <div style={{ textAlign: 'center', padding: '0 40px' }}>
            {statsIn && <CountUp target={cityCount} color={theme.countUpColor} />}
            <p style={{
              fontFamily:    '"Lato", sans-serif',
              fontSize:      '0.68rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color:         theme.statLabel,
              marginTop:     8,
            }}>
              {cityCount === 1 ? 'city' : 'cities'}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Globe canvas — lazy-loaded ── */}
      <div style={{ width: '100%' }}>
        {visible ? (
          <GlobeInner
            memories={memories}
            invitationTheme={invitationTheme ?? 'polaroid_white'}
          />
        ) : (
          <div style={{ height: '80vw', maxHeight: '85vh', background: theme.bg }} />
        )}
      </div>
    </section>
  );
}
