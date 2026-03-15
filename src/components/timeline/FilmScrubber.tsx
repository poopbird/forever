'use client';

import { useRef, useEffect } from 'react';
import type { Memory } from '@/types';

interface FilmScrubberProps {
  memories:  Memory[];
  activeIdx: number;
  onSelect:  (idx: number) => void;
}

export default function FilmScrubber({ memories, activeIdx, onSelect }: FilmScrubberProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep active thumbnail scrolled into centre of the scrubber strip
  useEffect(() => {
    const thumb = thumbRefs.current[activeIdx];
    const strip = scrollRef.current;
    if (!thumb || !strip) return;
    strip.scrollTo({
      left:     thumb.offsetLeft - strip.clientWidth / 2 + thumb.offsetWidth / 2,
      behavior: 'smooth',
    });
  }, [activeIdx]);

  return (
    <div className="w-full" style={{ background: '#0d0b08' }}>
      {/* Micro sprocket strip above thumbnails */}
      <div
        className="sprocket-strip w-full"
        style={{ height: 16, backgroundSize: '22px 100%' }}
      />

      {/* Thumbnail strip */}
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          background:     '#111008',
          gap:            2,
          padding:        '4px 0',
        }}
      >
        {memories.map((memory, i) => (
          <button
            key={memory.id}
            ref={el => { thumbRefs.current[i] = el; }}
            onClick={() => onSelect(i)}
            className="relative flex-none overflow-hidden transition-all duration-300 focus:outline-none"
            style={{
              width:   52,
              height:  38,
              border:  i === activeIdx
                ? '1.5px solid rgba(201,150,74,0.85)'
                : '1.5px solid rgba(255,255,255,0.08)',
              opacity: i === activeIdx ? 1 : 0.45,
              flexShrink: 0,
            }}
          >
            {memory.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={memory.media_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'sepia(0.18) contrast(1.02)' }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: '#1a1208' }}
              />
            )}

            {/* Active frame gold underline */}
            {i === activeIdx && (
              <div
                className="absolute inset-x-0 bottom-0"
                style={{ height: 2, background: 'rgba(201,150,74,0.9)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Micro sprocket strip below thumbnails */}
      <div
        className="sprocket-strip w-full"
        style={{ height: 16, backgroundSize: '22px 100%' }}
      />
    </div>
  );
}
