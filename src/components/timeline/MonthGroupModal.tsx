'use client';

import { motion } from 'framer-motion';
import MemoryThumbnail from './MemoryThumbnail';
import type { Memory } from '@/types';

interface MonthGroupModalProps {
  memories: Memory[];
  onClose: () => void;
  onSelect: (memory: Memory) => void;
}

export default function MonthGroupModal({ memories, onClose, onSelect }: MonthGroupModalProps) {
  const monthLabel = new Date(`${memories[0].date.slice(0, 7)}-02`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  function handleSelect(memory: Memory) {
    onClose();
    // Small delay so the group modal exits before the detail modal enters
    setTimeout(() => onSelect(memory), 150);
  }

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
        className="relative bg-cream w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 md:p-8"
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                     rounded-full bg-white/80 hover:bg-white text-ink shadow transition"
        >
          ✕
        </button>

        <h2 className="font-serif text-2xl text-rose-deep mb-1">{monthLabel}</h2>
        <p className="font-sans text-sm text-ink-light mb-6">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'} — tap one to open
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {memories.map((memory) => (
            <MemoryThumbnail
              key={memory.id}
              memory={memory}
              onClick={() => handleSelect(memory)}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
