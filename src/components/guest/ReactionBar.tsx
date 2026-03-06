'use client';

import { useEffect, useState } from 'react';
import type { ReactionCounts } from '@/types';

const EMOJIS = ['❤️', '😍', '😂', '😢', '🎉', '🙏'];

interface ReactionBarProps {
  memoryId: string;
}

export default function ReactionBar({ memoryId }: ReactionBarProps) {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reactions?memory_id=${memoryId}`)
      .then((r) => r.json())
      .then(setCounts)
      .finally(() => setLoading(false));
  }, [memoryId]);

  async function react(emoji: string) {
    // Optimistic update
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));

    await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_id: memoryId, emoji }),
    });
  }

  if (loading) return <div className="h-9 mb-4" />;

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => react(emoji)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-rose-100
                     bg-white hover:bg-rose-blush transition-colors duration-150
                     font-sans text-sm shadow-sm"
        >
          <span>{emoji}</span>
          {counts[emoji] ? (
            <span className="text-xs text-ink-light tabular-nums">{counts[emoji]}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
