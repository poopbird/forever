'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Memory } from '@/types';

interface FilmFrameProps {
  memory:     Memory;
  /** Global frame index (across all years) — shown as FRAME 001 */
  index:      number;
  isActive:   boolean;
  onClick:    () => void;
  frameRef:   (el: HTMLButtonElement | null) => void;
}

export default function FilmFrame({
  memory,
  index,
  isActive,
  onClick,
  frameRef,
}: FilmFrameProps) {
  const [imgError, setImgError] = useState(false);

  const dateLabel = new Date(`${memory.date}T12:00:00`).toLocaleDateString('en-GB', {
    month: 'long',
    year:  'numeric',
  });

  return (
    <motion.button
      ref={frameRef}
      onClick={onClick}
      animate={{
        scale:   isActive ? 1    : 0.86,
        opacity: isActive ? 1    : 0.48,
        y:       isActive ? -6   : 0,
      }}
      transition={{ duration: 0.4, ease: [0.34, 1.1, 0.64, 1] }}
      className="relative flex-none flex flex-col focus:outline-none text-left"
      style={{ width: 310 }}
    >
      {/* Top sprocket strip */}
      <div className="sprocket-strip w-full" style={{ height: 32 }} />

      {/* Photo frame — 3:4 portrait aspect ratio */}
      <div
        className="relative overflow-hidden w-full"
        style={{
          aspectRatio: '3 / 4',
          background: '#0a0a0a',
          border: '7px solid #1c1610',
          boxShadow: isActive
            ? '0 0 0 1px rgba(201,150,74,0.7), 0 0 50px rgba(201,150,74,0.22), 0 30px 70px rgba(0,0,0,0.75)'
            : '0 16px 48px rgba(0,0,0,0.6)',
          transition: 'box-shadow 0.4s ease',
        }}
      >
        {memory.media_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={memory.media_url}
            alt={memory.caption}
            className="w-full h-full object-cover"
            style={{ filter: 'sepia(0.14) contrast(1.05) brightness(0.95)' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(145deg, #1a1208, #0d0b08)',
            }}
          />
        )}

        {/* Inner mat vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
          }}
        />

        {/* Active glow overlay */}
        {isActive && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 30px rgba(201,150,74,0.07)' }}
          />
        )}
      </div>

      {/* Bottom sprocket strip */}
      <div className="sprocket-strip w-full" style={{ height: 32 }} />

      {/* Metadata row — between sprocket and caption */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ background: '#1c1610' }}
      >
        <span
          className="font-mono tracking-[0.2em]"
          style={{ fontSize: 9, color: 'rgba(201,150,74,0.55)' }}
        >
          FRAME {String(index + 1).padStart(3, '0')}
        </span>
        <span
          className="font-mono tracking-[0.15em]"
          style={{ fontSize: 9, color: 'rgba(201,150,74,0.32)' }}
        >
          KODAK 5219
        </span>
      </div>

      {/* Caption area */}
      <div
        className="px-2 pt-2 pb-3"
        style={{ opacity: isActive ? 1 : 0.45, transition: 'opacity 0.4s ease' }}
      >
        <p
          className="font-serif text-sm leading-snug line-clamp-2"
          style={{ color: 'rgba(232,213,176,0.92)' }}
        >
          {memory.caption}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {memory.location_name && (
            <span
              className="font-sans"
              style={{ fontSize: 10, color: 'rgba(201,150,74,0.65)' }}
            >
              📍 {memory.location_name}
            </span>
          )}
          <span
            className="font-mono"
            style={{ fontSize: 9, color: 'rgba(201,150,74,0.42)' }}
          >
            {dateLabel}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
