'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import MilestoneMarker from './MilestoneMarker';
import type { Memory } from '@/types';

interface TimelineEntryProps {
  memory: Memory;
  side: 'left' | 'right';
  onClick: () => void;
}

export default function TimelineEntry({ memory, side, onClick }: TimelineEntryProps) {
  const date = new Date(memory.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.li
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`flex items-center gap-4 ${side === 'right' ? 'flex-row-reverse' : ''}`}
    >
      {/* Memory card */}
      <button
        onClick={onClick}
        className="w-5/12 bg-white rounded-2xl shadow-md overflow-hidden
                   hover:shadow-xl transition-shadow duration-300 text-left group"
      >
        {memory.media_type === 'photo' && memory.media_url && (
          <div className="relative h-44 w-full">
            <Image
              src={memory.media_url}
              alt={memory.caption}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 400px"
            />
          </div>
        )}
        <div className="p-4">
          {memory.milestone_label && (
            <span
              className="inline-block mb-2 text-[10px] font-sans font-bold
                         tracking-wider uppercase text-rose-deep bg-rose-blush
                         px-2 py-0.5 rounded-full"
            >
              {memory.milestone_label}
            </span>
          )}
          <p className="font-serif text-base text-ink leading-snug line-clamp-2">
            {memory.caption}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-light font-sans">
            <span>{date}</span>
            {memory.location_name && (
              <>
                <span>·</span>
                <span className="truncate">📍 {memory.location_name}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Centre connector dot / milestone marker */}
      <div className="flex-none w-2/12 flex justify-center z-10">
        {memory.milestone_label ? (
          <MilestoneMarker label={memory.milestone_label} />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-rose-deep border-[3px] border-cream shadow" />
        )}
      </div>

      {/* Spacer on the opposite side */}
      <div className="w-5/12" />
    </motion.li>
  );
}
