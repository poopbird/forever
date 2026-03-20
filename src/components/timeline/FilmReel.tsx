'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FilmFrame    from './FilmFrame';
import FilmLeader   from './FilmLeader';
import FilmScrubber from './FilmScrubber';
import MemoryDetail    from '@/components/memory/MemoryDetail';
import MemoryEditModal from '@/components/memory/MemoryEditModal';
import type { Memory } from '@/types';

// ── Reel item types ──────────────────────────────────────────────────────────
type LeaderItem = { type: 'leader'; year: string };
type FrameItem  = { type: 'frame';  memory: Memory; frameIndex: number };
type ReelItem   = LeaderItem | FrameItem;

function buildReelItems(memories: Memory[]): ReelItem[] {
  const sorted = [...memories].sort((a, b) => a.date.localeCompare(b.date));
  const items: ReelItem[] = [];
  let lastYear   = '';
  let frameIndex = 0;
  for (const memory of sorted) {
    const year = memory.date.slice(0, 4);
    if (year !== lastYear) {
      items.push({ type: 'leader', year });
      lastYear = year;
    }
    items.push({ type: 'frame', memory, frameIndex: frameIndex++ });
  }
  return items;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface FilmReelProps {
  memories: Memory[];
  readOnly?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FilmReel({ memories: initialMemories, readOnly = false }: FilmReelProps) {
  const [memories,    setMemories]    = useState<Memory[]>(initialMemories);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [inView,      setInView]      = useState(false);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [selected,    setSelected]    = useState<Memory | null>(null);
  const [editing,     setEditing]     = useState<Memory | null>(null);

  const sectionRef    = useRef<HTMLElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const mouseOverRef  = useRef(false); // true while cursor is inside the film strip
  const frameRefs    = useRef<(HTMLButtonElement | null)[]>([]);
  const autoPlayRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIdxRef = useRef(0);
  const frameCountRef = useRef(0);

  const items       = buildReelItems(memories);
  const frameItems  = items.filter((i): i is FrameItem => i.type === 'frame');

  // Keep refs in sync
  useEffect(() => { activeIdxRef.current  = activeIdx;       }, [activeIdx]);
  useEffect(() => { frameCountRef.current = frameItems.length; }, [frameItems.length]);

  // ── Page-darkening IntersectionObserver ─────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.12 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // ── Scroll-to-frame ──────────────────────────────────────────────────────────
  const scrollToFrameIdx = useCallback((rawIdx: number) => {
    const count = frameCountRef.current;
    if (!count) return;
    const idx  = ((rawIdx % count) + count) % count; // wrap around
    const el   = frameRefs.current[idx];
    const strip = scrollRef.current;
    if (!el || !strip) return;
    strip.scrollTo({
      left:     el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2,
      behavior: 'smooth',
    });
    setActiveIdx(idx);
  }, []);

  // ── Scroll tracking + snap + wheel + keyboard ────────────────────────────────
  useEffect(() => {
    const strip = scrollRef.current;
    if (!strip) return;

    function findClosestIdx() {
      const center = strip!.scrollLeft + strip!.clientWidth / 2;
      let closest = 0, minDist = Infinity;
      frameRefs.current.forEach((el, i) => {
        if (!el) return;
        const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      return closest;
    }

    let snapTimer: ReturnType<typeof setTimeout> | null = null;

    function onScroll() {
      setActiveIdx(findClosestIdx());
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const idx = findClosestIdx();
        const el  = frameRefs.current[idx];
        if (el && strip) {
          strip.scrollTo({
            left:     el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2,
            behavior: 'smooth',
          });
        }
      }, 200);
    }

    // Wheel hijacking — only active while cursor is inside the strip
    function onMouseEnter() { mouseOverRef.current = true;  }
    function onMouseLeave() { mouseOverRef.current = false; }

    function onWheel(e: WheelEvent) {
      if (!mouseOverRef.current) return;
      if (strip!.scrollWidth <= strip!.clientWidth) return;
      e.preventDefault();
      strip!.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
      stopAutoPlay();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToFrameIdx(activeIdxRef.current + 1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToFrameIdx(activeIdxRef.current - 1);
      }
    }

    strip.addEventListener('scroll',     onScroll,     { passive: true });
    strip.addEventListener('mouseenter', onMouseEnter, { passive: true });
    strip.addEventListener('mouseleave', onMouseLeave, { passive: true });
    window.addEventListener('wheel',     onWheel,      { passive: false });
    window.addEventListener('keydown',   onKeyDown);

    return () => {
      strip.removeEventListener('scroll',     onScroll);
      strip.removeEventListener('mouseenter', onMouseEnter);
      strip.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('wheel',     onWheel);
      window.removeEventListener('keydown',   onKeyDown);
      if (snapTimer) clearTimeout(snapTimer);
    };
  }, [scrollToFrameIdx]);

  // ── Auto-play ────────────────────────────────────────────────────────────────
  function stopAutoPlay() {
    setIsPlaying(false);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }

  function startAutoPlay() {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsPlaying(true);
    autoPlayRef.current = setInterval(() => {
      const next = (activeIdxRef.current + 1) % (frameCountRef.current || 1);
      scrollToFrameIdx(next);
    }, 3500);
  }

  function toggleAutoPlay() {
    isPlaying ? stopAutoPlay() : startAutoPlay();
  }

  // Clean up interval on unmount
  useEffect(() => () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); }, []);

  // ── Memory handlers ─────────────────────────────────────────────────────────
  function handleDeleted(id: string) {
    setMemories(prev => prev.filter(m => m.id !== id));
    setEditing(null);
    setSelected(null);
  }

  function handleSaved(updated: Memory) {
    setMemories(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (memories.length === 0) {
    return (
      <section
        style={{ background: '#0d0b08', minHeight: '60vh' }}
        className="flex flex-col items-center justify-center gap-6 py-24"
      >
        <p className="font-serif text-2xl" style={{ color: 'rgba(232,213,176,0.55)' }}>
          Your story begins here.
        </p>
      </section>
    );
  }

  return (
    <>
      {/* ── Cinema overlay — dims the rest of the page as the section enters view ── */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 5, background: '#0a0806' }}
        animate={{ opacity: inView ? 0.92 : 0 }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      />

      {/* ── Film grain texture — fades in with the section ── */}
      <motion.div
        className="fixed inset-0 film-grain"
        style={{ zIndex: 6 }}
        animate={{ opacity: inView ? 0.038 : 0 }}
        transition={{ duration: 1.8 }}
      />

      {/* ── Main film reel section ── */}
      <section
        ref={sectionRef}
        className="relative w-full"
        style={{ background: '#0d0b08', zIndex: 10 }}
      >
        {/* Header */}
        <div className="text-center pt-16 pb-10">
          <p
            className="font-mono uppercase tracking-[0.45em]"
            style={{ fontSize: 10, color: 'rgba(201,150,74,0.45)', marginBottom: 12 }}
          >
            Now Screening
          </p>
          <h2
            className="font-serif"
            style={{ fontSize: 40, color: 'rgba(232,213,176,0.9)', letterSpacing: '-0.01em' }}
          >
            Our Story
          </h2>
        </div>

        {/* ── Horizontal film strip ── */}
        <div
          ref={scrollRef}
          className="film-strip overflow-x-auto overflow-y-visible"
        >
          <div
            className="flex items-start"
            style={{
              width:   'max-content',
              gap:     3,
              // centre-pad so first and last frames can be centred in viewport
              paddingLeft:  'calc(50vw - 155px)',
              paddingRight: 'calc(50vw - 155px)',
              paddingBottom: 24,
            }}
          >
            {items.map(item =>
              item.type === 'leader' ? (
                <FilmLeader key={`leader-${item.year}`} year={item.year} />
              ) : (
                <FilmFrame
                  key={item.memory.id}
                  memory={item.memory}
                  index={item.frameIndex}
                  isActive={activeIdx === item.frameIndex}
                  frameRef={el => { frameRefs.current[item.frameIndex] = el; }}
                  onClick={() => {
                    stopAutoPlay();
                    setSelected(item.memory);
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* ── Auto-play toggle ── */}
        <div className="flex justify-center pt-8 pb-4">
          <button
            onClick={toggleAutoPlay}
            className="flex items-center gap-2 rounded-full font-mono uppercase tracking-widest transition-all duration-300"
            style={{
              fontSize:   11,
              padding:    '10px 20px',
              background: isPlaying ? 'rgba(201,150,74,0.14)' : 'rgba(201,150,74,0.07)',
              border:     '1px solid rgba(201,150,74,0.38)',
              color:      'rgba(201,150,74,0.88)',
            }}
          >
            {isPlaying ? (
              <>
                <span style={{ fontSize: 12 }}>⏸</span>
                <span>Pause</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 12 }}>▶</span>
                <span>Auto-play</span>
              </>
            )}
          </button>
        </div>

        {/* ── Continue button — prominent escape hatch to scroll past the reel ── */}
        <div className="flex flex-col items-center gap-2 pb-4">
          <span
            className="font-mono uppercase tracking-[0.3em]"
            style={{ fontSize: 9, color: 'rgba(201,150,74,0.35)' }}
          >
            Done exploring?
          </span>
          <a
            href="#map"
            onClick={e => {
              const target = document.getElementById('map') ?? document.getElementById('faq-preview');
              if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2 font-mono uppercase tracking-widest rounded-full transition-all duration-200 hover:scale-105"
            style={{
              fontSize:   11,
              padding:    '11px 28px',
              background: 'rgba(201,150,74,0.1)',
              border:     '1px solid rgba(201,150,74,0.55)',
              color:      'rgba(201,150,74,0.9)',
              boxShadow:  '0 0 20px rgba(201,150,74,0.08)',
            }}
          >
            <span>↓</span>
            <span>Continue</span>
          </a>
        </div>

        {/* ── Film scrubber — thumbnail strip ── */}
        <FilmScrubber
          memories={frameItems.map(fi => fi.memory)}
          activeIdx={activeIdx}
          onSelect={idx => {
            stopAutoPlay();
            scrollToFrameIdx(idx);
          }}
        />

      </section>

      {/* ── Modals (high z-index, sit above everything) ── */}
      <AnimatePresence>
        {selected && (
          <MemoryDetail
            memory={selected}
            onClose={() => setSelected(null)}
            onEdit={readOnly ? undefined : m => { setSelected(null); setEditing(m); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <MemoryEditModal
            memory={editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>

    </>
  );
}
