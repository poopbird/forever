'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MemoryThumbnail from './MemoryThumbnail';
import type { Memory } from '@/types';

interface MonthGroupProps {
  /** "YYYY-MM" */
  monthKey: string;
  memories: Memory[];
  onSelect: (memory: Memory) => void;
}

export default function MonthGroup({ monthKey, memories, onSelect }: MonthGroupProps) {
  // id used by TimelineNav to scroll into view
  const sectionId = `month-${monthKey}`;
  const [expanded, setExpanded] = useState(true);

  const label = new Date(`${monthKey}-02`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const count = memories.length;

  return (
    <div id={sectionId} className="mb-6 scroll-mt-6">
      {/* ── Month header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 mb-3 group"
      >
        {/* Left rule */}
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-rose-light" />

        {/* Label */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-serif text-sm text-rose-deep tracking-wide">
            {label}
          </span>
          <span className="font-sans text-xs text-ink-light bg-cream-dark px-2 py-0.5 rounded-full">
            {count} {count === 1 ? 'memory' : 'memories'}
          </span>
          <span className="text-ink-light/50 text-xs transition-transform duration-200"
            style={{ display: 'inline-block', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            ▾
          </span>
        </div>

        {/* Right rule */}
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-rose-light" />
      </button>

      {/* ── Photo grid ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {memories.map((memory) => (
                <MemoryThumbnail
                  key={memory.id}
                  memory={memory}
                  onClick={() => onSelect(memory)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
