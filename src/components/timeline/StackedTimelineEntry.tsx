'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import MilestoneMarker from './MilestoneMarker';
import type { Memory } from '@/types';

// ─── Dimensions ──────────────────────────────────────────────────────────────
const CARD_W   = 288;   // layout width of every card (px)
const CARD_H   = 320;   // layout height
const CARD_IMG = 206;   // photo area height
const CARD_GAP = 56;    // gap between card layout boxes

const ACTIVE_SCALE    = 1.3;   // active card visual size  (~374px)
const INACTIVE_SCALE  = 0.82;  // dimmed card visual size  (~236px)
const INACTIVE_OPACITY = 0.68;

// Multi-layer box-shadow: gold ring + glow + drop shadow
const SHADOW_ACTIVE   =
  '0 0 0 2.5px #C9964A, 0 0 0 5px rgba(201,150,74,0.22), 0 32px 64px rgba(123,30,60,0.24)';
const SHADOW_INACTIVE = '0 3px 14px rgba(123,30,60,0.08)';

// ─── Single carousel card (needs own state for img error) ────────────────────
function CarouselCard({
  memory,
  isActive,
  monthLabel,
  cardRef,
  onClick,
}: {
  memory:     Memory;
  isActive:   boolean;
  monthLabel: string;
  cardRef:    (el: HTMLButtonElement | null) => void;
  onClick:    () => void;
}) {
  const [imgError, setImgError] = useState(false);

  const day = new Date(memory.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <motion.button
      ref={cardRef}
      onClick={onClick}
      animate={{
        scale:     isActive ? ACTIVE_SCALE   : INACTIVE_SCALE,
        opacity:   isActive ? 1               : INACTIVE_OPACITY,
        y:         isActive ? -10             : 0,
        boxShadow: isActive ? SHADOW_ACTIVE   : SHADOW_INACTIVE,
      }}
      transition={{ duration: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
      className="relative flex-none text-left"
      style={{
        width:        CARD_W,
        height:       CARD_H,
        borderRadius: '1rem',
        background:   '#FDF8F0',
        border:       '1.5px solid #F2D0D8',
        overflow:     'hidden',
      }}
    >
      {/* Photo */}
      <div className="relative overflow-hidden" style={{ height: CARD_IMG }}>
        {memory.media_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={memory.media_url}
            alt={memory.caption}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          /* No-image placeholder — rose gradient so card is visible against cream bg */
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(145deg, #F5C6D0 0%, #FDEAEF 45%, #EEC0CC 100%)',
            }}
          />
        )}
        {/* Month label bar */}
        <div
          className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-10"
          style={{ background: 'linear-gradient(to top, rgba(45,28,28,0.62), transparent)' }}
        >
          <p className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-white/90">
            {monthLabel}
          </p>
        </div>
      </div>

      {/* Text content */}
      <div className="px-4 pt-3 pb-3">
        {memory.milestone_label && (
          <span
            className="inline-block mb-1.5 text-[9px] font-sans font-bold
                       tracking-wider uppercase text-rose-deep bg-rose-blush
                       px-2 py-0.5 rounded-full"
          >
            {memory.milestone_label}
          </span>
        )}
        <p className="font-serif text-[14px] leading-snug text-ink line-clamp-2">
          {memory.caption}
        </p>
        {memory.location_name && (
          <p className="mt-1 font-sans text-[10px] text-ink-light flex items-center gap-1">
            <span>📍</span>
            {memory.location_name}
          </p>
        )}
        <p className="mt-1 font-sans text-[10px] text-ink-light/55">{day}</p>
      </div>

      {/* Decorative ✦ corners on active card */}
      {isActive &&
        (['top-2 left-2.5', 'top-2 right-2.5'] as const).map(pos => (
          <span
            key={pos}
            aria-hidden
            className={`absolute ${pos} text-[10px] leading-none select-none pointer-events-none`}
            style={{ color: 'rgba(201,150,74,0.75)' }}
          >
            ✦
          </span>
        ))}
    </motion.button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  memories: Memory[];
  onSingleClick: (memory: Memory) => void;
  onStackClick:  (memories: Memory[]) => void;
}

export default function StackedTimelineEntry({ memories, onSingleClick }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  const stripRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const mainMemory = memories[0];
  const milestone  = memories.find(m => m.milestone_label);
  const monthLabel = new Date(`${mainMemory.date.slice(0, 7)}-02`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    const strip = stripRef.current;
    const inner = innerRef.current;
    if (!strip || !inner) return;

    // Keep first/last card centerable by adding dynamic padding
    function setPadding() {
      const pad = Math.max(0, strip!.clientWidth / 2 - CARD_W / 2);
      inner!.style.paddingInline = `${pad}px`;
    }
    setPadding();
    const ro = new ResizeObserver(setPadding);
    ro.observe(strip);

    // Find which card center is closest to the strip's viewport center
    function findActive() {
      const center = strip!.scrollLeft + strip!.clientWidth / 2;
      let closest = 0, minDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      return closest;
    }

    let snapTimer: ReturnType<typeof setTimeout> | null = null;

    function onScroll() {
      setActiveIdx(findActive());
      // Soft-snap: after scrolling pauses, center the active card
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const idx  = findActive();
        const card = cardRefs.current[idx];
        if (card && strip) {
          strip.scrollTo({
            left: Math.max(0, card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2),
            behavior: 'smooth',
          });
        }
      }, 180);
    }

    // Redirect vertical wheel delta → horizontal scroll
    function onWheel(e: WheelEvent) {
      if (strip!.scrollWidth <= strip!.clientWidth) return;
      e.preventDefault();
      strip!.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
    }

    strip.addEventListener('scroll', onScroll, { passive: true });
    strip.addEventListener('wheel',  onWheel,  { passive: false });
    return () => {
      ro.disconnect();
      strip.removeEventListener('scroll', onScroll);
      strip.removeEventListener('wheel',  onWheel);
      if (snapTimer) clearTimeout(snapTimer);
    };
  }, []);

  return (
    <motion.li
      initial={{ opacity: 0, x: -32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex items-stretch"
    >
      {/* ── Timeline dot column ── */}
      <div className="relative flex-none w-10 flex items-center justify-center">
        {milestone?.milestone_label ? (
          <MilestoneMarker label={milestone.milestone_label} />
        ) : mainMemory.dot_emoji ? (
          <div
            className="w-8 h-8 rounded-full bg-cream border-2 border-rose-100 shadow-md
                        flex items-center justify-center text-base leading-none"
          >
            {mainMemory.dot_emoji}
          </div>
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-rose-deep border-[3px] border-cream shadow-md" />
        )}
      </div>

      {/* ── Card carousel ──
           The strip uses overflow-x:auto which forces overflow-y:auto per CSS spec,
           clipping box-shadows. We compensate by giving the inner div enough vertical
           padding so the shadow (offset 32 + blur 64 = ~96px) fits inside the border-box.
           The outer wrapper has no overflow so scaled cards and shadows are not clipped. */}
      <div className="flex-1 min-w-0">
        <div
          ref={stripRef}
          className="timeline-strip overflow-x-auto"
        >
          <div
            ref={innerRef}
            className="flex items-center"
            style={{ gap: CARD_GAP, width: 'max-content', paddingTop: 180, paddingBottom: 180 }}
          >
            {memories.map((memory, i) => (
              <CarouselCard
                key={memory.id}
                memory={memory}
                isActive={i === activeIdx}
                monthLabel={monthLabel}
                cardRef={el => { cardRefs.current[i] = el; }}
                onClick={() => onSingleClick(memory)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.li>
  );
}
