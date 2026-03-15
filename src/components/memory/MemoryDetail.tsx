'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import ReactionBar from '@/components/guest/ReactionBar';
import CommentSection from '@/components/guest/CommentSection';
import type { Memory } from '@/types';

interface MemoryDetailProps {
  memory: Memory;
  onClose: () => void;
  /** When provided, shows an ✏️ edit button (hidden in read-only / guest view) */
  onEdit?: (memory: Memory) => void;
}

export default function MemoryDetail({ memory, onClose, onEdit }: MemoryDetailProps) {
  // Collect all photos — prefer media_urls, fall back to single media_url
  const allPhotos: string[] = (
    memory.media_urls?.length
      ? memory.media_urls
      : memory.media_url
        ? [memory.media_url]
        : []
  ).filter(Boolean);

  const [photoIdx,  setPhotoIdx]  = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const hasMultiple = allPhotos.length > 1;

  function prev() {
    setDirection(-1);
    setPhotoIdx(i => (i - 1 + allPhotos.length) % allPhotos.length);
  }
  function next() {
    setDirection(1);
    setPhotoIdx(i => (i + 1) % allPhotos.length);
  }

  const date = new Date(memory.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-cream w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl"
      >
        {/* Top-right controls: Edit + Close */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(memory)}
              aria-label="Edit memory"
              title="Edit memory"
              className="w-8 h-8 flex items-center justify-center rounded-full
                         bg-white/80 hover:bg-white text-ink/60 hover:text-ink
                         shadow transition text-sm"
            >
              ✏️
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center
                       rounded-full bg-white/80 hover:bg-white text-ink shadow transition"
          >
            ✕
          </button>
        </div>

        {/* ── Photo carousel ── */}
        {memory.media_type === 'photo' && allPhotos.length > 0 && (
          <div className="relative h-80 w-full overflow-hidden rounded-t-3xl bg-cream-dark">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={photoIdx}
                custom={direction}
                variants={{
                  enter:  (d: number) => ({ x: d * 80, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit:   (d: number) => ({ x: d * -80, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <Image
                  src={allPhotos[photoIdx]}
                  alt={`${memory.caption} — photo ${photoIdx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </motion.div>
            </AnimatePresence>

            {/* Prev / Next arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                             w-9 h-9 rounded-full bg-black/35 hover:bg-black/55
                             text-white text-lg flex items-center justify-center
                             transition backdrop-blur-sm"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10
                             w-9 h-9 rounded-full bg-black/35 hover:bg-black/55
                             text-white text-lg flex items-center justify-center
                             transition backdrop-blur-sm"
                >
                  ›
                </button>
              </>
            )}

            {/* Dot indicators */}
            {hasMultiple && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10
                              flex gap-1.5 items-center">
                {allPhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > photoIdx ? 1 : -1); setPhotoIdx(i); }}
                    aria-label={`Go to photo ${i + 1}`}
                    className={`rounded-full transition-all duration-200
                      ${i === photoIdx
                        ? 'w-4 h-2 bg-white'
                        : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                      }`}
                  />
                ))}
              </div>
            )}

            {/* Photo count badge */}
            {hasMultiple && (
              <span className="absolute top-3 left-3 z-10
                               font-sans text-[11px] font-semibold text-white/90
                               bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-full">
                {photoIdx + 1} / {allPhotos.length}
              </span>
            )}
          </div>
        )}

        {/* ── Thumbnail strip ── */}
        {hasMultiple && (
          <div className="flex gap-2 px-6 pt-4 overflow-x-auto timeline-strip">
            {allPhotos.map((url, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > photoIdx ? 1 : -1); setPhotoIdx(i); }}
                className={`flex-none relative w-14 h-14 rounded-xl overflow-hidden transition-all duration-200
                  ${i === photoIdx
                    ? 'ring-2 ring-rose-deep ring-offset-1 ring-offset-cream scale-105'
                    : 'opacity-60 hover:opacity-90'
                  }`}
              >
                <Image
                  src={url}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </button>
            ))}
          </div>
        )}

        <div className="p-6 md:p-8">
          {memory.milestone_label && (
            <span
              className="inline-block mb-3 text-[10px] font-sans font-bold tracking-widest
                         uppercase text-rose-deep bg-rose-blush px-3 py-1 rounded-full"
            >
              {memory.milestone_label}
            </span>
          )}

          <p className="font-serif text-2xl text-ink mb-3 leading-snug">{memory.caption}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-light font-sans mb-6">
            <span>🗓 {date}</span>
            {memory.location_name && <span>📍 {memory.location_name}</span>}
          </div>

          <hr className="border-rose-100 mb-6" />

          <ReactionBar memoryId={memory.id} />
          <CommentSection memoryId={memory.id} />
        </div>
      </motion.div>
    </motion.div>
  );
}
