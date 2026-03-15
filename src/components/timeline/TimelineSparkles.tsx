'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Sparkle shapes & colours ─────────────────────────────────────────────
const CHARS  = ['✦', '✧', '⋆', '✺', '✸', '∗', '·', '✻'];
const COLORS = [
  '#C9964A',   // gold
  '#E8C97B',   // light gold
  '#F2C4CE',   // rose
  '#FDE8ED',   // blush
  '#C9964A',   // gold again (weighted)
  '#E8C97B',
];

// ─── Deterministic pseudo-random (avoids SSR / hydration mismatch) ────────
function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

// Round to 4dp — matches browser CSS precision so SSR HTML and client hydration agree
function r4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

// ─── Build ambient sparkles once (stable across renders) ──────────────────
interface AmbientSparkle {
  id: number;
  x: number;        // px from left edge of the interaction zone
  y: number;        // % from top of container
  size: number;
  color: string;
  delay: number;
  duration: number;
  char: string;
}

function buildAmbient(count: number): AmbientSparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id:       i,
    x:        r4(sr(i * 7)  * 68 - 10),   // –10 … +58 px (straddles the line at x=20)
    y:        r4(sr(i * 13) * 100),
    size:     r4(7 + sr(i * 3)  * 11),
    color:    COLORS[i % COLORS.length],
    delay:    r4(sr(i * 5)  * 4),
    duration: r4(1.6 + sr(i * 11) * 2.4),
    char:     CHARS[i % CHARS.length],
  }));
}

const AMBIENT = buildAmbient(36);

// ─── Burst sparkle ────────────────────────────────────────────────────────
interface Burst {
  id: number;
  x: number;
  y: number;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function TimelineSparkles() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId  = useRef(0);
  const lastMove = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastMove.current < 140) return; // throttle ~7fps
    lastMove.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const id   = burstId.current++;
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;

    setBursts(prev => [...prev.slice(-8), { id, x, y }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
  }, []);

  return (
    /*
      Sits inside the timeline's position:relative container.
      The 72px wide zone straddles the timeline line (at left:20px)
      and is the only interactive region.
    */
    <div
      aria-hidden
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{ left: 0, width: 72, zIndex: 5 }}
    >
      <div
        className="absolute inset-0"
        style={{ pointerEvents: 'auto' }}
        onMouseMove={handleMouseMove}
      >
        {/* ── Ambient twinkling sparkles ── */}
        {AMBIENT.map(s => (
          <motion.span
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x,
              top: `${s.y}%`,
              fontSize: s.size,
              color: s.color,
              lineHeight: 1,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            animate={{
              opacity: [0.12, 1,   0.12],
              scale:   [0.3,  1.4, 0.3],
              rotate:  [0,    180, 360],
            }}
            transition={{
              duration: s.duration,
              delay:    s.delay,
              repeat:   Infinity,
              ease:     'easeInOut',
            }}
          >
            {s.char}
          </motion.span>
        ))}

        {/* ── Mouse-burst sparkles ── */}
        <AnimatePresence>
          {bursts.map(b => (
            <div
              key={b.id}
              style={{ position: 'absolute', left: b.x, top: b.y, pointerEvents: 'none' }}
            >
              {[0, 1, 2, 3, 4, 5].map(ci => {
                const angle = (ci / 6) * Math.PI * 2;
                const dist  = 16 + ci * 5;
                return (
                  <motion.span
                    key={ci}
                    style={{
                      position: 'absolute',
                      fontSize: 8 + (ci % 3) * 3,
                      color: COLORS[ci % COLORS.length],
                      lineHeight: 1,
                      pointerEvents: 'none',
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.2 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist - 8,
                      opacity: 0,
                      scale: 1.6,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  >
                    {CHARS[ci % CHARS.length]}
                  </motion.span>
                );
              })}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
