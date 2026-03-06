'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import TimelineEntry from './TimelineEntry';
import MemoryDetail from '@/components/memory/MemoryDetail';
import MemoryForm from '@/components/memory/MemoryForm';
import type { Memory } from '@/types';

interface TimelineProps {
  memories: Memory[];
}

export default function Timeline({ memories }: TimelineProps) {
  const [selected, setSelected] = useState<Memory | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      {memories.length === 0 ? (
        <div className="text-center py-24 text-ink-light">
          <p className="font-serif text-3xl mb-2">Your story begins here.</p>
          <p className="font-sans text-sm mb-8 opacity-70">Add your first memory to get started.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add the first memory
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="timeline-line" aria-hidden />

          <ol className="space-y-14">
            {memories.map((memory, i) => (
              <TimelineEntry
                key={memory.id}
                memory={memory}
                side={i % 2 === 0 ? 'left' : 'right'}
                onClick={() => setSelected(memory)}
              />
            ))}
          </ol>
        </div>
      )}

      {/* Add memory CTA (always shown when there are existing memories) */}
      {memories.length > 0 && (
        <div className="text-center mt-16">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add a Memory
          </button>
        </div>
      )}

      {/* Memory detail modal */}
      <AnimatePresence>
        {selected && (
          <MemoryDetail
            memory={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* Add / edit memory form */}
      <AnimatePresence>
        {showForm && <MemoryForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  );
}
