'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import ReactionBar from '@/components/guest/ReactionBar';
import CommentSection from '@/components/guest/CommentSection';
import type { Memory } from '@/types';

interface MemoryDetailProps {
  memory: Memory;
  onClose: () => void;
}

export default function MemoryDetail({ memory, onClose }: MemoryDetailProps) {
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
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center
                     rounded-full bg-white/80 hover:bg-white text-ink shadow transition"
        >
          ✕
        </button>

        {/* Media */}
        {memory.media_type === 'photo' && memory.media_url && (
          <div className="relative h-72 w-full">
            <Image
              src={memory.media_url}
              alt={memory.caption}
              fill
              className="object-cover rounded-t-3xl"
              sizes="(max-width: 768px) 100vw, 672px"
            />
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
