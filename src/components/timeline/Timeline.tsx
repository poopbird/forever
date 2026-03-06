'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import StackedTimelineEntry from './StackedTimelineEntry';
import TimelineSparkles from './TimelineSparkles';
import MonthGroupModal from './MonthGroupModal';
import MemoryDetail from '@/components/memory/MemoryDetail';
import MemoryForm from '@/components/memory/MemoryForm';
import type { Memory } from '@/types';

interface TimelineProps {
  memories: Memory[];
}

export default function Timeline({ memories }: TimelineProps) {
  const [selected, setSelected] = useState<Memory | null>(null);
  const [groupOpen, setGroupOpen] = useState<Memory[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Group memories by YYYY-MM, each group sorted most recent first
  const monthGroups = useMemo(() => {
    const groups = new Map<string, Memory[]>();
    for (const memory of memories) {
      const key = memory.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(memory);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => b.date.localeCompare(a.date));
    }
    return Array.from(groups.entries());
  }, [memories]);

  if (memories.length === 0) {
    return (
      <>
        <div className="text-center py-24 text-ink-light">
          <p className="font-serif text-3xl mb-2">Your story begins here.</p>
          <p className="font-sans text-sm mb-8 opacity-70">
            Add your first memory to get started.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add the first memory
          </button>
        </div>
        <AnimatePresence>
          {showForm && <MemoryForm onClose={() => setShowForm(false)} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Left timeline line */}
        <div className="timeline-line" aria-hidden />
        {/* Interactive glitter sparkles along the line */}
        <TimelineSparkles />

        <ol className="space-y-6">
          {monthGroups.map(([monthKey, monthMemories]) => (
            <StackedTimelineEntry
              key={monthKey}
              memories={monthMemories}
              onSingleClick={setSelected}
              onStackClick={setGroupOpen}
            />
          ))}
        </ol>
      </div>

      <div className="text-center mt-16">
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add a Memory
        </button>
      </div>

      {/* Group modal — all memories in a month */}
      <AnimatePresence>
        {groupOpen && (
          <MonthGroupModal
            memories={groupOpen}
            onClose={() => setGroupOpen(null)}
            onSelect={setSelected}
          />
        )}
      </AnimatePresence>

      {/* Memory detail modal */}
      <AnimatePresence>
        {selected && (
          <MemoryDetail memory={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>

      {/* Add memory form */}
      <AnimatePresence>
        {showForm && <MemoryForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  );
}
