'use client';

import { useState, useEffect } from 'react';

interface ChangelogEntry {
  id: string;
  memory_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  /** memory caption — joined from memories table */
  memory_caption?: string;
}

interface GlobalChangelogEntry {
  id: string;
  memory_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  title:         'Title',
  caption:       'Caption',
  date:          'Date',
  location_name: 'Location',
  media_url:     'Photo',
};

const PAGE_SIZE = 10;

export default function ChangelogSection({ coupleId }: { coupleId: string }) {
  const [entries,  setEntries]  = useState<ChangelogEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [page,     setPage]     = useState(0);
  const [hasMore,  setHasMore]  = useState(false);

  useEffect(() => {
    loadPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  async function loadPage(pageNum: number) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/changelog?coupleId=${coupleId}&limit=${PAGE_SIZE + 1}&offset=${pageNum * PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error('Failed to load edit history');
      const raw: GlobalChangelogEntry[] = await res.json();
      const hasMoreResults = raw.length > PAGE_SIZE;
      const slice = raw.slice(0, PAGE_SIZE);

      if (pageNum === 0) {
        setEntries(slice);
      } else {
        setEntries(prev => [...prev, ...slice]);
      }
      setPage(pageNum);
      setHasMore(hasMoreResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading history');
    } finally {
      setLoading(false);
    }
  }

  if (loading && entries.length === 0) {
    return <p className="font-sans text-sm text-ink-light py-4">Loading edit history…</p>;
  }

  if (error) {
    return <p className="font-sans text-sm text-red-500 py-4">{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="font-sans text-sm text-ink-light py-4">
        No edits recorded yet. Changes you make to memories will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const when = new Date(entry.changed_at).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        const fieldLabel = FIELD_LABELS[entry.field_changed] ?? entry.field_changed;

        return (
          <div
            key={entry.id}
            className="rounded-xl border border-rose-100 bg-cream p-4 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-widest text-rose-deep">
                {fieldLabel} changed
              </span>
              <span className="font-sans text-xs text-ink-light shrink-0">{when}</span>
            </div>

            {entry.field_changed === 'media_url' ? (
              <p className="font-sans text-xs text-ink-light italic">Photo replaced</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-wider text-ink-light mb-0.5">
                    Before
                  </p>
                  <p className="font-sans text-sm text-ink line-clamp-2">
                    {entry.old_value || <em className="opacity-40">empty</em>}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-wider text-ink-light mb-0.5">
                    After
                  </p>
                  <p className="font-sans text-sm text-ink line-clamp-2">
                    {entry.new_value || <em className="opacity-40">empty</em>}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => loadPage(page + 1)}
          disabled={loading}
          className="w-full py-2.5 rounded-xl border border-rose-200 bg-white
                     font-sans text-sm text-ink-light hover:text-ink
                     hover:border-rose-300 transition disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
