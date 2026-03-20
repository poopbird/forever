'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BulkMemoryUpload from '@/components/memory/BulkMemoryUpload';
import MemoryEditModal from '@/components/memory/MemoryEditModal';
import { storageUrl } from '@/lib/storageUrl';
import type { Memory, CoupleAlbum } from '@/types';

const PAGE_SIZE = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function yearFromLabel(label: string): string {
  return label.slice(0, 4);
}

function autoYearAlbums(memories: Memory[]): Omit<CoupleAlbum, 'id' | 'couple_id' | 'created_at'>[] {
  const years = [...new Set(
    memories.map(m => m.date?.slice(0, 4)).filter(Boolean),
  )].sort() as string[];

  if (years.length === 0) return [];

  // Ensure at least 2 albums
  const effective = years.length >= 2 ? years : [years[0], years[0]];

  return effective.map((y, i) => ({
    label:           y,
    caption:         null,
    cover_photo_url: null,
    date_start:      `${y}-01-01`,
    date_end:        `${y}-12-31`,
    sort_order:      i,
  }));
}

function memoriesForYear(memories: Memory[], year: string): Memory[] {
  return memories.filter(m => m.date?.startsWith(year) && m.media_url);
}

// ── Cover photo strip ─────────────────────────────────────────────────────────

function CoverStrip({
  photos,
  selected,
  onSelect,
}: {
  photos: Memory[];
  selected: string | null;
  onSelect: (url: string) => void;
}) {
  if (photos.length === 0) {
    return <p className="text-xs text-ink-light italic">No photos in this album yet.</p>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.slice(0, 10).map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.media_url)}
          className="relative flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all"
          style={{ borderColor: selected === m.media_url ? '#c9964a' : 'transparent' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storageUrl(m.media_url, { width: 120, quality: 70 })}
            alt=""
            className="w-full h-full object-cover"
          />
          {selected === m.media_url && (
            <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Year album row ────────────────────────────────────────────────────────────

function YearAlbumRow({
  album,
  isNew,
  memories,
  onSaved,
}: {
  album: CoupleAlbum | Omit<CoupleAlbum, 'id' | 'couple_id' | 'created_at'>;
  isNew: boolean;
  memories: Memory[];
  onSaved: (saved: CoupleAlbum) => void;
}) {
  const id = 'id' in album ? album.id : null;
  const year = yearFromLabel(album.label);
  const albumMemories = memoriesForYear(memories, year);
  const memCount = albumMemories.length;

  const [caption,   setCaption]   = useState(album.caption ?? '');
  const [coverUrl,  setCoverUrl]  = useState(album.cover_photo_url ?? '');
  const [saving,    setSaving]    = useState(false);
  const [unsaved,   setUnsaved]   = useState(isNew);
  const [msg,       setMsg]       = useState('');

  // Default cover = most recent photo in year if none chosen
  const defaultCover = albumMemories[albumMemories.length - 1]?.media_url ?? null;
  const displayCover = coverUrl || defaultCover;

  function markUnsaved() { setUnsaved(true); setMsg(''); }

  async function save() {
    setSaving(true); setMsg('');
    const body = {
      label:           album.label,
      caption:         caption || null,
      cover_photo_url: coverUrl || null,
      date_start:      album.date_start,
      date_end:        album.date_end,
      sort_order:      album.sort_order,
    };
    const res = id
      ? await fetch(`/api/albums/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/albums',        { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    setSaving(false);
    if (res.ok) {
      const saved: CoupleAlbum = await res.json();
      setUnsaved(false);
      setMsg('✓ Saved');
      onSaved(saved);
    } else {
      setMsg('✗ Failed');
    }
  }

  return (
    <div className={`rounded-xl border p-5 transition-colors ${unsaved ? 'border-amber-500/40 bg-amber-500/5' : 'border-ink/10 bg-white/2'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-serif text-lg text-ink">{album.label}</p>
          <p className="text-xs text-ink-light mt-0.5">{memCount} {memCount === 1 ? 'memory' : 'memories'}</p>
        </div>
        {unsaved && (
          <span className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 whitespace-nowrap">
            ● Unsaved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="form-label block mb-1.5">Caption</label>
          <input
            type="text"
            className="form-input"
            value={caption}
            placeholder="e.g. Where it all began…"
            onChange={e => { setCaption(e.target.value); markUnsaved(); }}
          />
        </div>
        <div>
          <label className="form-label block mb-1.5">Cover photo</label>
          <CoverStrip
            photos={albumMemories}
            selected={coverUrl || displayCover}
            onSelect={url => { setCoverUrl(url); markUnsaved(); }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-ink/8">
        {msg && <span className="text-xs" style={{ color: msg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>{msg}</span>}
        <div className="ml-auto">
          <button className="btn-primary" onClick={save} disabled={saving || !unsaved}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manage photos modal ────────────────────────────────────────────────────────

function ManagePhotosModal({
  album,
  allMemories,
  assignedIds,
  onClose,
  onSave,
}: {
  album: CoupleAlbum;
  allMemories: Memory[];
  assignedIds: Set<string>;
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds));
  const [saving, setSaving] = useState(false);

  const photos = allMemories.filter(m => m.media_url);
  const inAlbum = photos.filter(m => selected.has(m.id));
  const unassigned = photos.filter(m => !selected.has(m.id));

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const ids = [...selected];
    const res = await fetch(`/api/albums/${album.id}/memories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_ids: ids }),
    });
    setSaving(false);
    if (res.ok) onSave(ids);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,3,1,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <h3 className="font-serif text-lg text-ink">Manage photos — {album.label}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-ink/60 text-sm transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {inAlbum.length > 0 && (
            <div>
              <p className="form-label mb-3">In this album ({inAlbum.length})</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {inAlbum.map(m => (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-amber-500 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storageUrl(m.media_url, { width: 150, quality: 70 })} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="form-label mb-3">Unassigned ({unassigned.length})</p>
            {unassigned.length === 0 ? (
              <p className="text-sm text-ink-light italic">All photos are assigned to albums.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {unassigned.map(m => (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-300 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storageUrl(m.media_url, { width: 150, quality: 70 })} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-ink/10">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save photos'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Freeform album row ────────────────────────────────────────────────────────

function FreeformAlbumRow({
  album,
  isNew,
  allMemories,
  albumMemoryIds,
  totalAlbums,
  onSaved,
  onDeleted,
  onMemoriesUpdated,
}: {
  album: CoupleAlbum;
  isNew: boolean;
  allMemories: Memory[];
  albumMemoryIds: Set<string>;
  totalAlbums: number;
  onSaved: (saved: CoupleAlbum) => void;
  onDeleted: (id: string) => void;
  onMemoriesUpdated: (albumId: string, ids: string[]) => void;
}) {
  const [label,    setLabel]    = useState(album.label);
  const [caption,  setCaption]  = useState(album.caption ?? '');
  const [coverUrl, setCoverUrl] = useState(album.cover_photo_url ?? '');
  const [unsaved,  setUnsaved]  = useState(isNew);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [showManage, setShowManage] = useState(false);
  const [deletingConfirm, setDeletingConfirm] = useState(false);

  const albumPhotos = allMemories.filter(m => albumMemoryIds.has(m.id) && m.media_url);
  const defaultCover = albumPhotos[albumPhotos.length - 1]?.media_url ?? null;
  const displayCover = coverUrl || defaultCover;

  function markUnsaved() { setUnsaved(true); setMsg(''); }

  async function save() {
    if (!label.trim()) return;
    setSaving(true); setMsg('');
    const body = { label: label.trim(), caption: caption || null, cover_photo_url: coverUrl || null, sort_order: album.sort_order };
    const res = await fetch(`/api/albums/${album.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { const saved = await res.json(); setUnsaved(false); setMsg('✓ Saved'); onSaved(saved); }
    else setMsg('✗ Failed');
  }

  async function handleDelete() {
    if (!deletingConfirm) { setDeletingConfirm(true); return; }
    const res = await fetch(`/api/albums/${album.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted(album.id);
    else { setMsg('✗ Cannot delete (minimum 2 albums)'); setDeletingConfirm(false); }
  }

  return (
    <>
      <div className={`rounded-xl border p-5 transition-colors ${unsaved ? 'border-amber-500/40 bg-amber-500/5' : 'border-ink/10 bg-white/2'}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-ink/20 cursor-grab text-xl select-none" title="Drag to reorder">⠿</span>
          <div className="flex-1">
            <label className="form-label block mb-1.5">Album title</label>
            <input
              type="text" className="form-input"
              value={label} placeholder="e.g. Paris, always"
              onChange={e => { setLabel(e.target.value); markUnsaved(); }}
            />
          </div>
          {unsaved && (
            <span className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 whitespace-nowrap self-end mb-1">
              ● Unsaved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label block mb-1.5">Caption</label>
            <input
              type="text" className="form-input"
              value={caption} placeholder="e.g. The trip that changed us"
              onChange={e => { setCaption(e.target.value); markUnsaved(); }}
            />
          </div>
          <div>
            <label className="form-label block mb-1.5">Cover photo</label>
            <CoverStrip
              photos={albumPhotos}
              selected={coverUrl || displayCover}
              onSelect={url => { setCoverUrl(url); markUnsaved(); }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-ink/8 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManage(true)}
              className="btn-ghost text-sm"
            >
              🖼 Manage photos ({albumPhotos.length})
            </button>
            {msg && <span className="text-xs" style={{ color: msg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>{msg}</span>}
          </div>
          <div className="flex items-center gap-2">
            {totalAlbums > 2 && (
              <button
                onClick={handleDelete}
                className="text-xs text-rose-deep/60 hover:text-rose-deep border border-rose-deep/20 hover:border-rose-deep/50 rounded-lg px-3 py-1.5 transition"
              >
                {deletingConfirm ? 'Confirm delete?' : 'Delete'}
              </button>
            )}
            <button className="btn-primary" onClick={save} disabled={saving || !unsaved}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {showManage && (
        <ManagePhotosModal
          album={album}
          allMemories={allMemories}
          assignedIds={albumMemoryIds}
          onClose={() => setShowManage(false)}
          onSave={ids => { onMemoriesUpdated(album.id, ids); setShowManage(false); }}
        />
      )}
    </>
  );
}

// ── Mode switch confirm modal ──────────────────────────────────────────────────

function ModeSwitchModal({ targetMode, onConfirm, onCancel }: {
  targetMode: 'year' | 'freeform';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="font-serif text-lg text-ink mb-2">Switch to {targetMode === 'year' ? 'Year' : 'Free-form'} albums?</h3>
        <p className="text-sm text-ink-light mb-5">
          This will clear your current album configuration. Your memories won&apos;t be lost.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} className="btn-primary">Switch</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MemoriesAlbumsSection({ coupleId }: { coupleId: string }) {
  const [memories,     setMemories]     = useState<Memory[]>([]);
  const [albums,       setAlbums]       = useState<CoupleAlbum[]>([]);
  const [albumMode,    setAlbumMode]    = useState<'year' | 'freeform'>('year');
  const [albumMemMap,  setAlbumMemMap]  = useState<Record<string, Set<string>>>({}); // albumId → Set<memoryId>
  const [loading,      setLoading]      = useState(true);
  const [memPage,      setMemPage]      = useState(1);
  const [showUpload,   setShowUpload]   = useState(false);
  const [editMemory,   setEditMemory]   = useState<Memory | null>(null);
  const [switchTarget,     setSwitchTarget]     = useState<'year' | 'freeform' | null>(null);
  const [filmReelEnabled,  setFilmReelEnabled]  = useState(false);
  const [filmReelSaving,   setFilmReelSaving]   = useState(false);
  const initialized = useRef(false);

  // ── Load all data ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [memRes, albRes, coupleRes] = await Promise.all([
      fetch('/api/memories'),
      fetch('/api/albums'),
      fetch('/api/couples'),
    ]);

    const mems: Memory[]       = memRes.ok  ? await memRes.json()    : [];
    const albs: CoupleAlbum[]  = albRes.ok  ? await albRes.json()    : [];
    const cfg                  = coupleRes.ok ? await coupleRes.json() : {};

    setMemories(mems.sort((a, b) => b.date?.localeCompare(a.date ?? '') ?? 0));
    setAlbumMode((cfg.album_mode as 'year' | 'freeform') ?? 'year');
    setFilmReelEnabled(Boolean(cfg.film_reel_enabled));

    // If no albums saved yet, seed from memory years
    if (albs.length === 0) {
      const seeds = autoYearAlbums(mems);
      setAlbums(seeds.map((s, i) => ({ ...s, id: `__new__${i}`, couple_id: coupleId, created_at: '' })));
    } else {
      setAlbums(albs);
      // For freeform albums, fetch memory assignments
      if ((cfg.album_mode ?? 'year') === 'freeform') {
        const mapEntries = await Promise.all(
          albs.map(async a => {
            const r = await fetch(`/api/albums/${a.id}/memories`);
            const ids: string[] = r.ok ? await r.json() : [];
            return [a.id, new Set(ids)] as [string, Set<string>];
          }),
        );
        setAlbumMemMap(Object.fromEntries(mapEntries));
      }
    }

    setLoading(false);
    initialized.current = true;
  }, [coupleId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Upload done → refresh memories ────────────────────────────────────────

  async function handleUploadClose() {
    setShowUpload(false);
    const res = await fetch('/api/memories');
    if (res.ok) {
      const mems: Memory[] = await res.json();
      setMemories(mems.sort((a, b) => b.date?.localeCompare(a.date ?? '') ?? 0));

      // In year mode, if a new year appeared → add new seeded album row
      if (albumMode === 'year') {
        const existingYears = new Set(albums.map(a => a.label));
        const newYears = [...new Set(mems.map(m => m.date?.slice(0, 4)).filter(Boolean))] as string[];
        const added = newYears.filter(y => !existingYears.has(y));
        if (added.length > 0) {
          const newAlbs: CoupleAlbum[] = added.map((y, i) => ({
            id: `__new__${Date.now()}_${i}`, couple_id: coupleId, created_at: '',
            label: y, caption: null, cover_photo_url: null,
            date_start: `${y}-01-01`, date_end: `${y}-12-31`,
            sort_order: albums.length + i,
          }));
          setAlbums(prev => [...prev, ...newAlbs].sort((a, b) => a.label.localeCompare(b.label)));
        }
      }
    }
  }

  // ── Mode switching ────────────────────────────────────────────────────────

  async function confirmSwitchMode() {
    if (!switchTarget) return;
    const newMode = switchTarget;
    setSwitchTarget(null);

    // Clear existing albums in DB
    await Promise.all(albums.filter(a => !a.id.startsWith('__new__')).map(a =>
      fetch(`/api/albums/${a.id}`, { method: 'DELETE' }),
    ));

    // Save new mode
    await fetch('/api/couples', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album_mode: newMode }),
    });

    setAlbumMode(newMode);
    setAlbumMemMap({});

    if (newMode === 'year') {
      const seeds = autoYearAlbums(memories);
      setAlbums(seeds.map((s, i) => ({ ...s, id: `__new__${i}`, couple_id: coupleId, created_at: '' })));
    } else {
      // Start with 2 empty freeform albums
      setAlbums([
        { id: `__new__0`, couple_id: coupleId, created_at: '', label: 'Album 1', caption: null, cover_photo_url: null, date_start: null, date_end: null, sort_order: 0 },
        { id: `__new__1`, couple_id: coupleId, created_at: '', label: 'Album 2', caption: null, cover_photo_url: null, date_start: null, date_end: null, sort_order: 1 },
      ]);
    }
  }

  // ── Album callbacks ───────────────────────────────────────────────────────

  function handleAlbumSaved(saved: CoupleAlbum) {
    setAlbums(prev => {
      const idx = prev.findIndex(a => a.id === saved.id || (a.label === saved.label && a.id.startsWith('__new__')));
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  }

  function handleAlbumDeleted(id: string) {
    setAlbums(prev => prev.filter(a => a.id !== id));
    setAlbumMemMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function handleMemoriesUpdated(albumId: string, ids: string[]) {
    setAlbumMemMap(prev => ({ ...prev, [albumId]: new Set(ids) }));
  }

  async function addFreeformAlbum() {
    const sortOrder = albums.length;
    const res = await fetch('/api/albums', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: `Album ${sortOrder + 1}`, sort_order: sortOrder }),
    });
    if (res.ok) {
      const saved: CoupleAlbum = await res.json();
      setAlbums(prev => [...prev, saved]);
      setAlbumMemMap(prev => ({ ...prev, [saved.id]: new Set() }));
    }
  }

  // ── Film reel toggle ──────────────────────────────────────────────────────

  async function toggleFilmReel() {
    const next = !filmReelEnabled;
    setFilmReelEnabled(next);
    setFilmReelSaving(true);
    await fetch('/api/couples', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_reel_enabled: next }),
    });
    setFilmReelSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const pagedMemories = memories.slice(0, memPage * PAGE_SIZE);
  const hasMore = pagedMemories.length < memories.length;

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="font-serif text-xl text-ink mb-1">Memories &amp; Albums</h2>
      <p className="font-sans text-sm text-ink-light mb-6">Upload photos and configure how they appear on your public page.</p>

      {/* ── Upload section ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sans text-sm font-bold tracking-widest uppercase text-ink/50">Your Memories</h3>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>+ Add Memories</button>
        </div>

        {loading ? (
          <div className="h-24 flex items-center justify-center text-ink-light text-sm">Loading…</div>
        ) : memories.length === 0 ? (
          <div className="h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink/10 rounded-xl">
            <p className="text-sm text-ink-light">No memories yet</p>
            <button className="btn-primary text-sm" onClick={() => setShowUpload(true)}>Upload your first photo</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
              {pagedMemories.map(m => (
                <button
                  key={m.id}
                  onClick={() => setEditMemory(m)}
                  className="relative aspect-square rounded-lg overflow-hidden group border-2 border-transparent hover:border-rose-deep/40 transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storageUrl(m.media_url, { width: 120, quality: 70 })}
                    alt={m.caption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm transition">✏️</span>
                  </div>
                </button>
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-3">
                <button className="btn-ghost text-sm" onClick={() => setMemPage(p => p + 1)}>
                  Load more ({memories.length - pagedMemories.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-ink/8 mb-6" />

      {/* ── Album configuration ── */}
      <div>
        <h3 className="font-sans text-sm font-bold tracking-widest uppercase text-ink/50 mb-4">Album Configuration</h3>

        {/* Mode toggle */}
        <div className="inline-flex bg-ink/5 rounded-xl p-1 gap-1 mb-5">
          {(['year', 'freeform'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => albumMode !== mode && setSwitchTarget(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                albumMode === mode
                  ? 'bg-rose-deep text-white shadow-sm'
                  : 'text-ink/50 hover:text-ink/70'
              }`}
            >
              {mode === 'year' ? '📅 Year albums' : '✦ Free-form'}
            </button>
          ))}
        </div>

        <p className="text-xs text-ink-light mb-5">
          {albumMode === 'year'
            ? 'Albums are created automatically — one per year. Add a caption and choose a cover photo for each.'
            : 'Create your own albums and choose which memories go into each. Drag ⠿ to reorder.'}
        </p>

        {loading ? (
          <div className="text-sm text-ink-light">Loading albums…</div>
        ) : albumMode === 'year' ? (
          <div className="space-y-3">
            {albums.map(a => (
              <YearAlbumRow
                key={a.id}
                album={a}
                isNew={a.id.startsWith('__new__')}
                memories={memories}
                onSaved={handleAlbumSaved}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {albums.map(a => (
              <FreeformAlbumRow
                key={a.id}
                album={a}
                isNew={a.id.startsWith('__new__')}
                allMemories={memories}
                albumMemoryIds={albumMemMap[a.id] ?? new Set()}
                totalAlbums={albums.length}
                onSaved={handleAlbumSaved}
                onDeleted={handleAlbumDeleted}
                onMemoriesUpdated={handleMemoriesUpdated}
              />
            ))}
            <button
              onClick={addFreeformAlbum}
              className="w-full py-3 border-2 border-dashed border-ink/15 hover:border-ink/30 rounded-xl text-sm text-ink/40 hover:text-ink/60 font-semibold transition"
            >
              + Add album
            </button>
          </div>
        )}
      </div>

      {/* ── Film Reel section toggle ── */}
      <div className="border-t border-ink/8 mt-6 pt-6">
        <h3 className="font-sans text-sm font-bold tracking-widest uppercase text-ink/50 mb-1">Film Reel Section</h3>
        <p className="text-xs text-ink-light mb-4">
          Show a cinematic film-strip view of your memories below the album section on your page.
        </p>
        <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-ink/2 px-4 py-3">
          <div>
            <p className="font-sans text-sm font-semibold text-ink">Film Reel</p>
            <p className="text-xs text-ink-light mt-0.5">
              {filmReelEnabled
                ? '✓ Visible on your public page — below the album section'
                : 'Hidden from your page'}
            </p>
          </div>
          <button
            onClick={toggleFilmReel}
            disabled={filmReelSaving}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
            style={{ background: filmReelEnabled ? '#7B1E3C' : '#d1d5db' }}
            aria-label="Toggle Film Reel section"
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              style={{ transform: filmReelEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {showUpload && <BulkMemoryUpload onClose={handleUploadClose} />}
      {editMemory && (
        <MemoryEditModal
          memory={editMemory}
          onClose={() => setEditMemory(null)}
          onSaved={updated => { setMemories(prev => prev.map(m => m.id === updated.id ? updated : m)); setEditMemory(null); }}
          onDeleted={id => { setMemories(prev => prev.filter(m => m.id !== id)); setEditMemory(null); }}
        />
      )}
      {switchTarget && (
        <ModeSwitchModal
          targetMode={switchTarget}
          onConfirm={confirmSwitchMode}
          onCancel={() => setSwitchTarget(null)}
        />
      )}
    </section>
  );
}
