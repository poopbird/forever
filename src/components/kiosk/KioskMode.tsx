'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Memory } from '@/types';

const DISPLAY_MS = 7000; // 7 seconds per memory
const TRANSITION_S = 1.2; // crossfade duration

interface KioskModeProps {
  memories: Memory[];
  coupleName: string | null;
  coupleId: string;
}

export default function KioskMode({ memories, coupleName, coupleId }: KioskModeProps) {
  const slides = memories.filter(m => m.media_type === 'photo' && m.media_url);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setIdx(i => (i + 1) % Math.max(slides.length, 1));
    setProgress(0);
  }, [slides.length]);

  // Progress tick
  useEffect(() => {
    if (paused || slides.length === 0) return;
    const TICK = 80; // ms
    const step = (TICK / DISPLAY_MS) * 100;
    const id = setInterval(() => {
      setProgress(p => {
        if (p + step >= 100) { advance(); return 0; }
        return p + step;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [paused, advance, slides.length]);

  // Auto-hide controls after 3 s of no mouse movement
  useEffect(() => {
    function show() {
      setShowControls(true);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show);
    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('touchstart', show);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  // Keyboard: ← → to navigate, Space to pause, Escape handled by parent
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') { advance(); }
      if (e.key === 'ArrowLeft') { setIdx(i => (i - 1 + slides.length) % slides.length); setProgress(0); }
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, slides.length]);

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 z-[9999]">
        <p className="font-serif text-white/50 text-2xl">No photos to display</p>
        <a href={`/view/${coupleId}`} className="font-sans text-sm text-white/30 hover:text-white/60 transition underline">
          ← Back to site
        </a>
      </div>
    );
  }

  const current = slides[idx];
  const date = new Date(current.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 bg-black z-[9999] select-none"
      onClick={() => setPaused(p => !p)}
    >
      {/* ── Full-screen photo with Ken Burns zoom ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1.0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: TRANSITION_S }, scale: { duration: DISPLAY_MS / 1000, ease: 'linear' } }}
          className="absolute inset-0"
        >
          <Image
            src={current.media_url!}
            alt={current.caption}
            fill
            className="object-cover"
            sizes="100vw"
            quality={80}
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Bottom gradient for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)' }}
      />
      {/* Top gradient for controls readability */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
      />

      {/* ── Top bar: couple name + controls ── */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-0 inset-x-0 px-8 pt-7 flex items-center justify-between"
      >
        {/* Couple name */}
        <div className="flex items-center gap-2.5">
          <span className="text-gold-warm/70 text-xs">✦</span>
          <p className="font-serif text-white/90 text-lg tracking-wide">{coupleName}</p>
          <span className="text-gold-warm/70 text-xs">✦</span>
        </div>

        {/* Controls: pause + exit */}
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setPaused(p => !p)}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm
                       text-white flex items-center justify-center transition text-sm"
          >
            {paused ? '▶' : '⏸'}
          </button>
          <a
            href={`/view/${coupleId}`}
            aria-label="Exit kiosk"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm
                       text-white flex items-center justify-center transition text-sm font-sans"
          >
            ✕
          </a>
        </div>
      </motion.div>

      {/* ── Memory info ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + '-info'}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-14 inset-x-0 px-8 md:px-20 text-center pointer-events-none"
        >
          {current.milestone_label && (
            <span className="inline-block mb-3 text-[11px] font-sans font-bold tracking-widest
                             uppercase text-gold-warm bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
              {current.milestone_label}
            </span>
          )}
          <p className="font-serif text-white text-3xl md:text-5xl leading-tight mb-4 drop-shadow-lg">
            {current.caption}
          </p>
          <div className="flex items-center justify-center gap-4 font-sans text-sm text-white/65">
            <span>🗓 {date}</span>
            {current.location_name && <span>📍 {current.location_name}</span>}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/15">
        <div
          className="h-full bg-gold-warm transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Dot indicators ── */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* ── Slide counter (top-right, subtle) ── */}
      <div className="absolute top-8 right-20 font-sans text-xs text-white/40 tracking-widest pointer-events-none">
        {idx + 1} / {slides.length}
      </div>

      {/* ── Paused overlay ── */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-full p-5">
              <span className="text-white text-4xl leading-none">⏸</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Keyboard hint (shows briefly at start) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-8 right-8 font-sans text-[10px] text-white/25 pointer-events-none hidden md:block"
      >
        ← → navigate · Space pause · ✕ exit
      </motion.div>
    </div>
  );
}
