'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { uploadFileDirect } from '@/lib/uploadDirect';
import type { Memory } from '@/types';

interface MemoryEditModalProps {
  memory: Memory;
  onClose: () => void;
  /** Called with the updated memory after a successful save */
  onSaved: (updated: Memory) => void;
  /** Called with the memory id after a successful delete */
  onDeleted: (id: string) => void;
}

type Tab = 'edit' | 'changelog';

interface ChangelogEntry {
  id: string;
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

export default function MemoryEditModal({
  memory,
  onClose,
  onSaved,
  onDeleted,
}: MemoryEditModalProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [caption,      setCaption]      = useState(memory.caption ?? '');
  const [date,         setDate]         = useState(memory.date ?? '');
  const [locationName, setLocationName] = useState(memory.location_name ?? '');
  const [previewUrl,   setPreviewUrl]   = useState<string>(memory.media_url ?? '');
  const [pendingFile,  setPendingFile]  = useState<File | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [tab,           setTab]           = useState<Tab>('edit');
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  // ── Changelog state ──────────────────────────────────────────────────────────
  const [changelog,      setChangelog]      = useState<ChangelogEntry[] | null>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError,   setChangelogError]   = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Photo pick ──────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // ── Changelog fetch ─────────────────────────────────────────────────────────
  async function loadChangelog() {
    setChangelogLoading(true);
    setChangelogError('');
    try {
      const res = await fetch(`/api/memories/${memory.id}/changelog`);
      if (!res.ok) throw new Error('Failed to load history');
      const data: ChangelogEntry[] = await res.json();
      setChangelog(data);
    } catch (err) {
      setChangelogError(err instanceof Error ? err.message : 'Error loading history');
    } finally {
      setChangelogLoading(false);
    }
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    if (next === 'changelog' && changelog === null) loadChangelog();
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      let mediaUrl = memory.media_url;

      // Upload new photo if one was picked
      if (pendingFile) {
        mediaUrl = await uploadFileDirect(pendingFile);
      }

      const payload = {
        version:       memory.version ?? 1,
        caption:       caption.trim(),
        date,
        location_name: locationName.trim() || null,
        media_url:     mediaUrl,
        media_urls:    [mediaUrl],
      };

      const res = await fetch(`/api/memories/${memory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setSaveError(
          'This memory was edited elsewhere. Please close and re-open it, then try again.',
        );
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to save');
      }

      const updated: Memory = await res.json();
      onSaved(updated);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/memories/${memory.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to delete');
      }
      onDeleted(memory.id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  const isDirty =
    caption.trim()        !== (memory.caption ?? '')        ||
    date                  !== (memory.date ?? '')            ||
    locationName.trim()   !== (memory.location_name ?? '')   ||
    pendingFile           !== null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        exit={{ scale: 0.94,   opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-cream w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-rose-100">
          <h2 className="font-serif text-xl text-ink">Edit Memory</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-white/80 hover:bg-white text-ink shadow transition"
          >
            ✕
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-rose-100 px-6">
          {(['edit', 'changelog'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`py-2.5 px-4 text-sm font-sans font-medium border-b-2 transition-colors
                ${tab === t
                  ? 'border-rose-deep text-rose-deep'
                  : 'border-transparent text-ink-light hover:text-ink'
                }`}
            >
              {t === 'edit' ? '✏️ Edit' : '🕐 History'}
            </button>
          ))}
        </div>

        {/* ── Edit tab ── */}
        <AnimatePresence mode="wait">
          {tab === 'edit' && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="p-6 space-y-5"
            >
              {/* Photo */}
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-widest
                                  text-ink-light mb-2">
                  Photo
                </label>
                <div
                  className="relative h-52 rounded-2xl overflow-hidden bg-cream-dark cursor-pointer
                             group border-2 border-dashed border-rose-200 hover:border-rose-deep transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Memory photo"
                      fill
                      className="object-cover"
                      sizes="448px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-ink-light">
                      <span className="font-sans text-sm">Click to add photo</span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition
                                  flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition
                                     font-sans text-sm font-semibold text-white bg-black/50
                                     px-3 py-1.5 rounded-full">
                      Change photo
                    </span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {pendingFile && (
                  <p className="mt-1 font-sans text-xs text-ink-light">
                    New photo selected — will upload on save.
                  </p>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-widest
                                  text-ink-light mb-1.5">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Describe this moment…"
                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5
                             font-serif text-base text-ink resize-none
                             focus:outline-none focus:ring-2 focus:ring-rose-deep/30"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-widest
                                  text-ink-light mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5
                             font-sans text-sm text-ink
                             focus:outline-none focus:ring-2 focus:ring-rose-deep/30"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-widest
                                  text-ink-light mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  placeholder="e.g. Paris, France"
                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5
                             font-sans text-sm text-ink
                             focus:outline-none focus:ring-2 focus:ring-rose-deep/30"
                />
              </div>

              {/* Error */}
              {saveError && (
                <p className="font-sans text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  {saveError}
                </p>
              )}

              {/* Save / Delete row */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="flex-1 py-2.5 rounded-xl bg-rose-deep hover:bg-rose-700 disabled:opacity-50
                             text-white font-sans text-sm font-semibold transition"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="py-2.5 px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50
                             text-red-500 hover:text-red-600 font-sans text-sm font-semibold transition"
                >
                  🗑 Delete
                </button>
              </div>

              {/* Confirm delete */}
              <AnimatePresence>
                {confirmDelete && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 space-y-2"
                  >
                    <p className="font-sans text-sm font-semibold text-red-700">
                      Delete this memory?
                    </p>
                    <p className="font-sans text-xs text-red-500">
                      This cannot be undone. The photo and all reactions will be permanently removed.
                    </p>
                    {deleteError && (
                      <p className="font-sans text-xs text-red-600 font-medium">{deleteError}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50
                                   text-white font-sans text-sm font-semibold transition"
                      >
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-xl bg-white hover:bg-red-50 border border-red-200
                                   text-red-600 font-sans text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Changelog tab ── */}
          {tab === 'changelog' && (
            <motion.div
              key="changelog"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6"
            >
              {changelogLoading && (
                <p className="font-sans text-sm text-ink-light text-center py-8">Loading history…</p>
              )}
              {changelogError && (
                <p className="font-sans text-sm text-red-500 text-center py-8">{changelogError}</p>
              )}
              {!changelogLoading && !changelogError && changelog !== null && (
                changelog.length === 0 ? (
                  <p className="font-sans text-sm text-ink-light text-center py-8">
                    No edits recorded yet.
                  </p>
                ) : (
                  <ol className="space-y-4">
                    {changelog.map((entry) => {
                      const when = new Date(entry.changed_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      });
                      const fieldLabel = FIELD_LABELS[entry.field_changed] ?? entry.field_changed;
                      return (
                        <li
                          key={entry.id}
                          className="rounded-xl border border-rose-100 bg-white p-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-xs font-semibold uppercase
                                             tracking-widest text-rose-deep">
                              {fieldLabel} changed
                            </span>
                            <span className="font-sans text-xs text-ink-light">{when}</span>
                          </div>
                          {entry.field_changed === 'media_url' ? (
                            <p className="font-sans text-xs text-ink-light italic">Photo replaced</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="font-sans text-[10px] uppercase tracking-wider
                                               text-ink-light mb-1">Before</p>
                                <p className="font-sans text-sm text-ink line-clamp-3">
                                  {entry.old_value || <em className="opacity-40">empty</em>}
                                </p>
                              </div>
                              <div>
                                <p className="font-sans text-[10px] uppercase tracking-wider
                                               text-ink-light mb-1">After</p>
                                <p className="font-sans text-sm text-ink line-clamp-3">
                                  {entry.new_value || <em className="opacity-40">empty</em>}
                                </p>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
