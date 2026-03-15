'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import MilestoneMarker from './MilestoneMarker';
import type { Memory } from '@/types';

// Deterministic rotation angles — cycles per entry index
const ROTATIONS = [-2.5, 1.5, -1, 2, -2, 1, -1.5, 2.5];

interface ScrapbookEntryProps {
  memories: Memory[];
  /** Entry index — used for rotation cycle */
  index: number;
  onSingleClick: (memory: Memory) => void;
  onStackClick: (memories: Memory[]) => void;
}

export default function ScrapbookEntry({
  memories,
  index,
  onSingleClick,
  onStackClick,
}: ScrapbookEntryProps) {
  const [hovered, setHovered] = useState(false);

  const base = ROTATIONS[index % ROTATIONS.length];
  const topMemory = memories[0];
  const extraMemories = memories.slice(1);
  const backgroundCount = Math.min(2, extraMemories.length);
  const milestone = memories.find((m) => m.milestone_label);

  const monthLabel = new Date(`${topMemory.date.slice(0, 7)}-02`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  function handleClick() {
    if (memories.length === 1) {
      onSingleClick(topMemory);
    } else {
      onStackClick(memories);
    }
  }

  // Peek cards fan behind the front card
  // collapsed: slightly offset; hovered: fan out more
  const peekRotations = [base + 7, base - 5];
  const peekRotationsHover = [base + 15, base - 12];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: (index % 3) * 0.07 }}
      className="relative cursor-pointer select-none"
      style={{ overflow: 'visible' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* ── Peek cards behind the front card ── */}
      {Array.from({ length: backgroundCount }).map((_, i) => (
        <motion.div
          key={`peek-${i}`}
          animate={{
            rotate: hovered ? peekRotationsHover[i] : peekRotations[i],
            y: hovered ? (i === 0 ? -4 : 2) : 0,
            opacity: 0.85 - i * 0.2,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-0 rounded-2xl bg-white"
          style={{
            zIndex: backgroundCount - i,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}
        />
      ))}

      {/* ── Front card ── */}
      <motion.div
        animate={{
          rotate: hovered ? 0 : base,
          y: hovered ? -10 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative rounded-2xl overflow-hidden bg-white"
        style={{
          zIndex: backgroundCount + 1,
          boxShadow: hovered
            ? '0 20px 45px rgba(61,44,44,0.18)'
            : '0 4px 16px rgba(61,44,44,0.10)',
        }}
      >
        {/* Photo */}
        <div className="relative h-40 w-full overflow-hidden bg-cream-dark">
          {topMemory.media_url && (
            <Image
              src={topMemory.media_url}
              alt={topMemory.caption}
              fill
              className={`object-cover transition-transform duration-500 ${
                hovered ? 'scale-105' : 'scale-100'
              }`}
              sizes="(max-width: 768px) 50vw, 350px"
            />
          )}
        </div>

        {/* Text */}
        <div className="p-3.5">
          {milestone?.milestone_label && (
            <span
              className="inline-block mb-1.5 text-[10px] font-sans font-bold
                         tracking-wider uppercase text-rose-deep bg-rose-blush
                         px-2 py-0.5 rounded-full"
            >
              {milestone.milestone_label}
            </span>
          )}
          <p className="font-serif text-sm text-ink leading-snug line-clamp-2">
            {topMemory.caption}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-light font-sans">{monthLabel}</span>
            {extraMemories.length > 0 && (
              <span
                className="shrink-0 text-[10px] font-sans font-bold
                           text-rose-deep bg-rose-blush px-2 py-0.5 rounded-full"
              >
                +{extraMemories.length} more
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Milestone marker beneath card */}
      {milestone?.milestone_label && (
        <div className="flex justify-center mt-3">
          <MilestoneMarker label={milestone.milestone_label} />
        </div>
      )}
    </motion.div>
  );
}
