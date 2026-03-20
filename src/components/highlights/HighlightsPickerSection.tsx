'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import PolaroidPicker from './PolaroidPicker';
import { storageUrl } from '@/lib/storageUrl';
import type { Memory } from '@/types';

const MAX_HIGHLIGHTS = 20;

export default function HighlightsPickerSection() {
  const [highlights,   setHighlights]   = useState<Memory[]>([]);
  const [allMemories,  setAllMemories]  = useState<Memory[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showPicker,   setShowPicker]   = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [hlRes, memRes] = await Promise.all([
      fetch('/api/highlights'),
      fetch('/api/memories'),
    ]);
    const hl: Memory[]  = hlRes.ok  ? await hlRes.json()  : [];
    const mem: Memory[] = memRes.ok ? await memRes.json() : [];
    setHighlights(hl);
    setAllMemories(mem);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleSaved(saved: Memory[]) {
    setHighlights(saved);
    setShowPicker(false);
  }

  // Build slots: selected highlights + empty dashes up to MAX_HIGHLIGHTS
  const slots = Array.from({ length: MAX_HIGHLIGHTS }, (_, i) => highlights[i] ?? null);

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-serif text-xl text-ink">Wedding Highlights</h2>
          <p className="font-sans text-sm text-ink-light mt-1">
            Choose up to 20 photos to feature as polaroids in the highlights reel on your page.
          </p>
        </div>
        <button
          className="btn-primary shrink-0 mt-1"
          onClick={() => setShowPicker(true)}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Edit selections'}
        </button>
      </div>

      {/* Status line */}
      <p className="font-sans text-xs text-ink-light mb-4">
        {loading
          ? 'Loading…'
          : highlights.length === 0
          ? 'No highlights selected yet — click "Edit selections" to choose photos.'
          : `${highlights.length} of ${MAX_HIGHLIGHTS} slots filled`}
      </p>

      {/* Thumbnail grid: 20 fixed slots */}
      <div className="grid grid-cols-10 gap-1.5">
        {slots.map((memory, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden"
            style={{
              background: memory ? undefined : 'transparent',
              border: memory ? undefined : '1.5px dashed rgba(0,0,0,0.12)',
            }}
          >
            {memory ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(memory.media_url, { width: 120, quality: 70 })}
                  alt={memory.caption ?? ''}
                  className="w-full h-full object-cover"
                />
                {/* Position badge */}
                <div
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                  style={{ background: '#C9964A', fontSize: 8, fontWeight: 700 }}
                >
                  {i + 1}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.2)', fontWeight: 700 }}>{i + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Picker modal */}
      <AnimatePresence>
        {showPicker && (
          <PolaroidPicker
            allMemories={allMemories}
            currentHighlights={highlights}
            onSave={handleSaved}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
