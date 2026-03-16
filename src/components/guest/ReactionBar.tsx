'use client';

import { useEffect, useState } from 'react';
import type { ReactionCounts } from '@/types';

const EMOJIS = ['❤️', '😍', '😂', '😢', '🎉', '🙏'];
const storageKey = (memoryId: string) => `forever_reactions_${memoryId}`;

// { emoji: rowId } — tracks which emojis this browser session has reacted to
type LocalReactions = Record<string, string>;

function readLocal(memoryId: string): LocalReactions {
  try {
    return JSON.parse(localStorage.getItem(storageKey(memoryId)) ?? '{}');
  } catch {
    return {};
  }
}

function writeLocal(memoryId: string, data: LocalReactions) {
  localStorage.setItem(storageKey(memoryId), JSON.stringify(data));
}

interface ReactionBarProps {
  memoryId: string;
}

export default function ReactionBar({ memoryId }: ReactionBarProps) {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [myReactions, setMyReactions] = useState<LocalReactions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMyReactions(readLocal(memoryId));
    fetch(`/api/reactions?memory_id=${memoryId}`)
      .then((r) => r.json())
      .then(setCounts)
      .finally(() => setLoading(false));
  }, [memoryId]);

  async function react(emoji: string) {
    const alreadyReactedId = myReactions[emoji];

    if (alreadyReactedId) {
      // Toggle OFF — optimistic decrement
      setCounts((prev) => ({ ...prev, [emoji]: Math.max((prev[emoji] ?? 1) - 1, 0) }));
      const next = { ...myReactions };
      delete next[emoji];
      setMyReactions(next);
      writeLocal(memoryId, next);

      await fetch(`/api/reactions?id=${alreadyReactedId}`, { method: 'DELETE' });
    } else {
      // Toggle ON — optimistic increment
      setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));

      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memoryId, emoji }),
      });

      if (res.ok) {
        const row = await res.json();
        const next = { ...myReactions, [emoji]: row.id };
        setMyReactions(next);
        writeLocal(memoryId, next);
      }
    }
  }

  if (loading) return <div className="h-9 mb-4" />;

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {EMOJIS.map((emoji) => {
        const active = !!myReactions[emoji];
        return (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors duration-150 font-sans text-sm shadow-sm
              ${active
                ? 'border-rose-300 bg-rose-blush text-rose-500'
                : 'border-rose-100 bg-white hover:bg-rose-blush'
              }`}
          >
            <span>{emoji}</span>
            {counts[emoji] ? (
              <span className="text-xs text-ink-light tabular-nums">{counts[emoji]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
