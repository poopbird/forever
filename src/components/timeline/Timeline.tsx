'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import StackedTimelineEntry from './StackedTimelineEntry';
import TimelineSparkles from './TimelineSparkles';
import TimelineJumpNav from './TimelineJumpNav';
import MonthGroupModal from './MonthGroupModal';
import MemoryDetail from '@/components/memory/MemoryDetail';
import MemoryEditModal from '@/components/memory/MemoryEditModal';
import BulkMemoryUpload from '@/components/memory/BulkMemoryUpload';
import type { Memory } from '@/types';

interface TimelineProps {
  memories: Memory[];
  /** When true, hides add / edit controls (used in public guest view) */
  readOnly?: boolean;
}

type TimelineItem =
  | { type: 'year'; year: string }
  | { type: 'month'; key: string; memories: Memory[] };

export default function Timeline({ memories: initialMemories, readOnly = false }: TimelineProps) {
  // Local copy so we can optimistically update / remove memories
  const [memories, setMemories] = useState<Memory[]>(initialMemories);

  const [selected,  setSelected]  = useState<Memory | null>(null);
  const [editing,   setEditing]   = useState<Memory | null>(null);
  const [groupOpen, setGroupOpen] = useState<Memory[] | null>(null);
  const [showForm,  setShowForm]  = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleMemoryDeleted(id: string) {
    setMemories(prev => prev.filter(m => m.id !== id));
    setGroupOpen(prev => {
      if (!prev) return null;
      const updated = prev.filter(m => m.id !== id);
      return updated.length > 0 ? updated : null;
    });
    setEditing(null);
    setSelected(null);
  }

  function handleMemorySaved(updated: Memory) {
    setMemories(prev => prev.map(m => m.id === updated.id ? updated : m));
    // Refresh group modal if the memory was in it
    setGroupOpen(prev => {
      if (!prev) return null;
      return prev.map(m => m.id === updated.id ? updated : m);
    });
  }

  function handleOpenEdit(memory: Memory) {
    setSelected(null);   // close detail modal first
    setEditing(memory);
  }

  // ── Group memories by YYYY-MM ────────────────────────────────────────────────
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

  // ── Build flat item list interleaved with year-chapter markers ───────────────
  const { items, years } = useMemo(() => {
    const result: TimelineItem[] = [];
    const yearList: string[] = [];
    let lastYear = '';
    for (const [monthKey, monthMemories] of monthGroups) {
      const year = monthKey.slice(0, 4);
      if (year !== lastYear) {
        result.push({ type: 'year', year });
        yearList.push(year);
        lastYear = year;
      }
      result.push({ type: 'month', key: monthKey, memories: monthMemories });
    }
    return { items: result, years: yearList };
  }, [monthGroups]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (memories.length === 0) {
    return (
      <>
        <div className="text-center py-24 text-ink-light">
          <p className="font-serif text-3xl mb-2">Your story begins here.</p>
          <p className="font-sans text-sm mb-8 opacity-70">
            Add your first memory to get started.
          </p>
          {!readOnly && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Add the first memory
            </button>
          )}
        </div>
        {!readOnly && (
          <AnimatePresence>
            {showForm && <BulkMemoryUpload onClose={() => setShowForm(false)} />}
          </AnimatePresence>
        )}
      </>
    );
  }

  return (
    <>
      {/* Year jump navigation */}
      <TimelineJumpNav years={years} />

      <div className="relative">
        {/* Left timeline line */}
        <div className="timeline-line" aria-hidden />
        {/* Interactive glitter sparkles along the line */}
        <TimelineSparkles />

        <ol className="space-y-6">
          {items.map((item) =>
            item.type === 'year' ? (
              /* ── Year chapter separator ── */
              <li
                key={`year-${item.year}`}
                id={`year-${item.year}`}
                className="flex items-center"
                aria-label={`Year ${item.year}`}
              >
                {/* Dot column — rotated diamond as chapter marker */}
                <div className="relative flex-none w-10 flex items-center justify-center">
                  <div
                    className="w-4 h-4 rotate-45 bg-cream shadow-sm"
                    style={{ border: '2px solid #C9964A' }}
                  />
                </div>

                {/* Year label + decorative rule */}
                <div className="flex items-center gap-3 flex-1 pl-4 py-3">
                  <span
                    className="font-serif text-2xl select-none"
                    style={{ color: 'rgba(201,150,74,0.75)' }}
                  >
                    {item.year}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(201,150,74,0.35), transparent)',
                    }}
                  />
                  <span
                    aria-hidden
                    className="font-sans text-[10px] select-none"
                    style={{ color: 'rgba(201,150,74,0.4)' }}
                  >
                    ✦ ✦ ✦
                  </span>
                </div>
              </li>
            ) : (
              /* ── Month memory stack ── */
              <StackedTimelineEntry
                key={item.key}
                memories={item.memories}
                onSingleClick={setSelected}
                onStackClick={setGroupOpen}
              />
            )
          )}
        </ol>
      </div>

      {!readOnly && (
        <div className="text-center mt-16">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add a Memory
          </button>
        </div>
      )}

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
          <MemoryDetail
            memory={selected}
            onClose={() => setSelected(null)}
            onEdit={readOnly ? undefined : handleOpenEdit}
          />
        )}
      </AnimatePresence>

      {/* Memory edit modal */}
      <AnimatePresence>
        {editing && (
          <MemoryEditModal
            memory={editing}
            onClose={() => setEditing(null)}
            onSaved={handleMemorySaved}
            onDeleted={handleMemoryDeleted}
          />
        )}
      </AnimatePresence>

      {/* Add memory — bulk upload (one card per photo) */}
      {!readOnly && (
        <AnimatePresence>
          {showForm && <BulkMemoryUpload onClose={() => setShowForm(false)} />}
        </AnimatePresence>
      )}
    </>
  );
}
