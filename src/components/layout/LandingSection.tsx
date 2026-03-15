'use client';

import { useMemo, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Memory } from '@/types';

interface Props {
  memories: Memory[];
  /** DB value overrides NEXT_PUBLIC_RELATIONSHIP_START_DATE */
  startDate?: string;
}

// ── rAF-based animated count-up number ───────────────────────────────────────
function StatCounter({
  value,
  label,
  icon,
  delay = 0,
}: {
  value: number;
  label: string;
  icon: string;
  delay?: number;
}) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const spanRef    = useRef<HTMLSpanElement>(null);
  const inView     = useInView(wrapRef, { once: true, margin: '-40px' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    if (value === 0) {
      if (spanRef.current) spanRef.current.textContent = '0';
      return;
    }

    const timeout = setTimeout(() => {
      const duration = 1100;
      const startTime = performance.now();
      function tick(now: number) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = Math.round(eased * value);
        if (spanRef.current) spanRef.current.textContent = String(current);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay * 1000 + 200);

    return () => clearTimeout(timeout);
  }, [inView, value, delay]);

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay, ease: 'easeOut' }}
      className="flex flex-col items-center gap-3"
    >
      <span className="text-4xl">{icon}</span>
      <span
        ref={spanRef}
        className="font-serif text-5xl md:text-6xl font-bold text-rose-deep leading-none"
      >
        0
      </span>
      <span className="font-sans text-xs tracking-[0.2em] uppercase text-ink-light">
        {label}
      </span>
    </motion.div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function LandingSection({ memories, startDate: startDateProp }: Props) {
  const startDateRaw = startDateProp ?? process.env.NEXT_PUBLIC_RELATIONSHIP_START_DATE;

  const stats = useMemo(() => {
    const years = startDateRaw
      ? Math.floor((Date.now() - new Date(startDateRaw).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0;
    const places = new Set(memories.map(m => m.location_name).filter(Boolean)).size;
    return { years, places, total: memories.length };
  }, [memories, startDateRaw]);

  if (memories.length === 0) return null;

  return (
    <section className="bg-cream py-24 px-4">
      <div className="max-w-3xl mx-auto">

        {/* ── Section eyebrow ── */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-sans text-[11px] tracking-[0.4em] uppercase text-center mb-14"
          style={{ color: 'rgba(201,150,74,0.75)' }}
        >
          ✦ &nbsp; Our Journey So Far &nbsp; ✦
        </motion.p>

        {/* ── Milestone counters ── */}
        <div className="grid grid-cols-3 gap-6 md:gap-12">
          <StatCounter value={stats.years}  label="Years Together" icon="💛" delay={0}    />
          <StatCounter value={stats.total}  label="Memories"       icon="📷" delay={0.12} />
          <StatCounter value={stats.places} label="Places Visited" icon="📍" delay={0.24} />
        </div>

      </div>
    </section>
  );
}
