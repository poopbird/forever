'use client';

import { motion } from 'framer-motion';

// Seeded pseudo-random — stable across SSR + client hydration
function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

// Round to 4 decimal places — matches browser CSS value precision so
// SSR-rendered HTML and client hydration always agree on every number.
function r4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

const PETALS = Array.from({ length: 22 }, (_, i) => {
  const opacity = r4(0.3 + sr(i * 23) * 0.5);
  const size    = r4(7 + sr(i * 7) * 14);
  return {
    id:       i,
    x:        r4(sr(i * 3)  * 100),
    size,
    height:   r4(size * 0.65),
    delay:    r4(sr(i * 11) * 10),
    duration: r4(10 + sr(i * 13) * 12),
    drift:    r4((sr(i * 17) - 0.5) * 220),
    rotate:   r4(sr(i * 19) * 720 - 360),
    opacity,
    // Pre-build the background string with rounded opacity so it never drifts
    bg:       `radial-gradient(ellipse, rgba(253,232,237,${opacity}) 0%, rgba(168,50,88,${r4(opacity * 0.55)}) 100%)`,
  };
});

const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const size = r4(1 + sr(i * 41) * 2.5);
  return {
    id:       i,
    x:        r4(sr(i * 31) * 100),
    y:        r4(sr(i * 37) * 100),
    size,
    delay:    r4(sr(i * 43) * 7),
    duration: r4(2.5 + sr(i * 47) * 3.5),
    // Pre-build box-shadow with rounded values
    shadow:   `0 0 ${r4(size * 3)}px ${r4(size * 1.5)}px rgba(255,255,255,0.35)`,
  };
});

export default function RosePetals() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* ── Falling rose petals ── */}
      {PETALS.map(p => (
        <motion.div
          key={`petal-${p.id}`}
          style={{
            position:     'absolute',
            left:         `${p.x}%`,
            top:          '-4%',
            width:        p.size,
            height:       p.height,
            borderRadius: '60% 40% 60% 40% / 60% 40% 60% 40%',
            background:   p.bg,
          }}
          animate={{
            y:       ['0vh', '112vh'],
            x:       [0, p.drift],
            rotate:  [0, p.rotate],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay:    p.delay,
            repeat:   Infinity,
            ease:     'linear',
          }}
        />
      ))}

      {/* ── Twinkling light particles ── */}
      {PARTICLES.map(p => (
        <motion.div
          key={`particle-${p.id}`}
          style={{
            position:     'absolute',
            left:         `${p.x}%`,
            top:          `${p.y}%`,
            width:        p.size,
            height:       p.size,
            borderRadius: '50%',
            background:   'white',
            boxShadow:    p.shadow,
          }}
          animate={{
            opacity: [0.05, 0.75, 0.05],
            scale:   [0.7, 1.4, 0.7],
          }}
          transition={{
            duration: p.duration,
            delay:    p.delay,
            repeat:   Infinity,
            ease:     'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
