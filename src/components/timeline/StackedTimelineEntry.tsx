'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import MilestoneMarker from './MilestoneMarker';
import type { Memory } from '@/types';

// ─── Dimensions ──────────────────────────────────────────────────────────────
const MAIN_W   = 400;   // main card width  (px)
const MAIN_IMG = 264;   // main card photo height — near-landscape ratio
const FAN_W    = 200;   // fan card width   (px)
const FAN_IMG  = 156;   // fan card photo height
const FAN_H    = 228;   // fan card total height
const OVERLAP  = 68;    // px each fan card slides under its neighbour
const MAIN_Z   = 20;    // z-index for main card

// Gold–rose gradient border used on the main card frame
const FRAME_GRADIENT =
  'linear-gradient(#FDF8F0, #FDF8F0) padding-box, ' +
  'linear-gradient(160deg, #C9964A 0%, #E8C97B 22%, #FDE8ED 50%, #E8C97B 78%, #C9964A 100%) border-box';

// ─── Vignette overlay ────────────────────────────────────────────────────────
function Vignette({ strength = 0.28 }: { strength?: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 44%, rgba(61,44,44,${strength}) 100%)`,
      }}
    />
  );
}

// ─── Fan card ────────────────────────────────────────────────────────────────
function FanCard({
  memory,
  zIndex,
  side,
  onClick,
}: {
  memory: Memory;
  zIndex: number;
  side: 'left' | 'right';
  onClick: () => void;
}) {
  const day = new Date(memory.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      whileHover={{ y: -12, scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className="relative flex-none text-left cursor-pointer"
      style={{
        width:  FAN_W,
        height: FAN_H,
        zIndex,
        borderRadius: '1rem',
        background: '#FDF8F0',
        border: '1.5px solid #F2D0D8',
        boxShadow: '0 5px 22px rgba(123,30,60,0.10)',
        overflow: 'hidden',
      }}
    >
      {/* Photo */}
      <div className="relative overflow-hidden" style={{ height: FAN_IMG }}>
        {memory.media_url ? (
          <Image src={memory.media_url} alt={memory.caption} fill
            className="object-cover" sizes="200px" />
        ) : (
          <div className="w-full h-full bg-rose-blush/40" />
        )}
        <Vignette />

        {/* Date chip over photo */}
        <span className="absolute bottom-2 right-2 font-sans text-[9px] font-medium
                         tracking-wider text-white/90 bg-black/25 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {new Date(memory.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Caption */}
      <div className="px-3 pt-2.5 pb-3">
        <p className="font-serif text-[12px] text-ink line-clamp-2 leading-snug">
          {memory.caption}
        </p>
        <p className="font-sans text-[10px] text-ink-light mt-1">{day}</p>
      </div>

      {/* Depth shadow on the side facing main card */}
      <div
        aria-hidden
        className="absolute inset-y-0 pointer-events-none"
        style={{
          [side === 'left' ? 'right' : 'left']: 0,
          width: OVERLAP + 12,
          background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'},
            transparent 0%, rgba(61,44,44,0.07) 100%)`,
        }}
      />
    </motion.button>
  );
}

// ─── Main entry ──────────────────────────────────────────────────────────────
interface Props {
  memories: Memory[];
  onSingleClick: (memory: Memory) => void;
  onStackClick:  (memories: Memory[]) => void;
}

export default function StackedTimelineEntry({ memories, onSingleClick, onStackClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const mainRef  = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const mainMemory = memories[0];
  const extras     = memories.slice(1);
  const milestone  = memories.find((m) => m.milestone_label);

  const monthLabel = new Date(`${mainMemory.date.slice(0, 7)}-02`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  // Distribute: even index → right of main, odd → left
  const rightCards: Memory[] = [];
  const leftCards:  Memory[] = [];
  extras.forEach((m, i) => {
    if (i % 2 === 0) rightCards.push(m);
    else             leftCards.push(m);
  });

  const visibleLeft  = hovered ? leftCards  : leftCards.slice(0, 1);
  const visibleRight = hovered ? rightCards : rightCards.slice(0, 1);
  const leftDOM      = [...visibleLeft].reverse();   // far → close in DOM order

  // ── Keep main card centred in the strip at all times
  useEffect(() => {
    if (!mainRef.current || !stripRef.current) return;
    const strip  = stripRef.current;
    const card   = mainRef.current;
    const target = card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2;
    if (hovered) {
      strip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    } else {
      strip.scrollLeft = Math.max(0, target);
    }
  }, [hovered, visibleLeft.length, visibleRight.length]);

  function handleMainClick() {
    if (memories.length === 1) onSingleClick(mainMemory);
    else                       onStackClick(memories);
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex items-stretch"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Dot column ── */}
      <div className="relative flex-none w-10 flex items-center justify-center">
        {milestone?.milestone_label ? (
          <MilestoneMarker label={milestone.milestone_label} />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-rose-deep border-[3px] border-cream shadow-md" />
        )}
      </div>

      {/* ── Scrollable card strip ── */}
      <div ref={stripRef} className="timeline-strip flex-1 overflow-x-auto">
        {/*
          py-14 gives 56px clearance top+bottom so scale/lift animation
          isn't clipped by the implicit overflow-y:auto of the scroll container.
        */}
        <div
          className="flex items-center py-14 px-10 gap-0"
          style={{ width: 'max-content', minWidth: '100%' }}
        >
          {/* Left fan cards — far → close */}
          <AnimatePresence initial={false}>
            {leftDOM.map((m, i) => {
              const zIdx = i + 1;
              return (
                <motion.div key={m.id}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -28 }}
                  transition={{ duration: 0.24, delay: (leftDOM.length - 1 - i) * 0.05 }}
                  style={{ position: 'relative', zIndex: zIdx, marginRight: `-${OVERLAP}px` }}
                >
                  <FanCard memory={m} zIndex={zIdx} side="left" onClick={() => onSingleClick(m)} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── MAIN CARD ── */}
          <motion.button
            ref={mainRef}
            onClick={handleMainClick}
            animate={{
              y:     hovered ? -20 : 0,
              scale: hovered ? 1.08 : 1,
            }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative flex-none text-left group"
            style={{
              width:        MAIN_W,
              zIndex:       MAIN_Z,
              borderRadius: '1.25rem',
              background:   FRAME_GRADIENT,
              border:       '2.5px solid transparent',
              boxShadow: hovered
                ? '0 36px 72px rgba(123,30,60,0.22), 0 0 0 1px rgba(201,150,74,0.18)'
                : '0 10px 32px rgba(123,30,60,0.14), 0 0 0 1px rgba(201,150,74,0.12)',
            }}
          >
            {/* Photo — cropped inside inner rounded rect */}
            <div className="overflow-hidden" style={{ borderRadius: '0.875rem 0.875rem 0 0' }}>
              <div className="relative" style={{ height: MAIN_IMG }}>
                {mainMemory.media_url ? (
                  <Image
                    src={mainMemory.media_url}
                    alt={mainMemory.caption}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="400px"
                  />
                ) : (
                  <div className="w-full h-full bg-rose-blush/30" />
                )}
                <Vignette strength={0.32} />

                {/* Month label gradient bar at photo bottom */}
                <div
                  className="absolute bottom-0 inset-x-0 px-5 pb-4 pt-10 flex items-end justify-between"
                  style={{ background: 'linear-gradient(to top, rgba(45,28,28,0.6) 0%, transparent 100%)' }}
                >
                  <p className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-white/90">
                    {monthLabel}
                  </p>
                  {extras.length > 0 && !hovered && (
                    <p className="font-sans text-[10px] text-white/70 italic">
                      hover to explore {extras.length} more ↔
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content area */}
            <div
              className="px-5 py-4"
              style={{
                background: '#FDF8F0',
                borderRadius: '0 0 0.875rem 0.875rem',
              }}
            >
              {milestone?.milestone_label && (
                <span className="inline-block mb-2 text-[10px] font-sans font-bold
                                 tracking-wider uppercase text-rose-deep bg-rose-blush
                                 px-2.5 py-0.5 rounded-full">
                  {milestone.milestone_label}
                </span>
              )}
              <p className="font-serif text-[17px] leading-snug text-ink line-clamp-2">
                {mainMemory.caption}
              </p>
              {mainMemory.location_name && (
                <p className="mt-1.5 font-sans text-[11px] text-ink-light flex items-center gap-1">
                  <span>📍</span>
                  {mainMemory.location_name}
                </p>
              )}
            </div>

            {/* Decorative ✦ corners */}
            {(['top-2.5 left-3', 'top-2.5 right-3'] as const).map((pos) => (
              <span key={pos} aria-hidden
                className={`absolute ${pos} text-[11px] leading-none select-none pointer-events-none`}
                style={{ color: 'rgba(201,150,74,0.6)' }}>
                ✦
              </span>
            ))}
          </motion.button>

          {/* Right fan cards — close → far */}
          <AnimatePresence initial={false}>
            {visibleRight.map((m, i) => {
              const zIdx = visibleRight.length - i;
              return (
                <motion.div key={m.id}
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 28 }}
                  transition={{ duration: 0.24, delay: i * 0.05 }}
                  style={{ position: 'relative', zIndex: zIdx, marginLeft: `-${OVERLAP}px` }}
                >
                  <FanCard memory={m} zIndex={zIdx} side="right" onClick={() => onSingleClick(m)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}
