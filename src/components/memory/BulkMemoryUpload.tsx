'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractExif } from '@/lib/exif';
import { uploadFileDirect } from '@/lib/uploadDirect';

// ── Types ────────────────────────────────────────────────────────────────────

type UploadState = 'uploading' | 'done' | 'error';

interface CardState {
  id: string;
  file: File;
  preview: string;
  caption: string;
  date: string;
  locationName: string;
  lat?: number;
  lng?: number;
  showOnMap: boolean;
  uploadState: UploadState;
  uploadedUrl?: string;
}

interface Props {
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BulkMemoryUpload({ onClose }: Props) {
  const [cards, setCards]         = useState<CardState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep a ref always pointing to the latest cards for use in async handlers
  const cardsRef = useRef<CardState[]>([]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // Stable per-card updater
  const updateCard = useCallback((id: string, patch: Partial<CardState>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  // ── File selection ─────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!selected.length) return;

    // 1. Create card stubs immediately so previews appear at once
    const newCards: CardState[] = selected.map(file => ({
      id:           makeId(),
      file,
      preview:      URL.createObjectURL(file),
      caption:      '',
      date:         todayString(),
      locationName: '',
      showOnMap:    true,
      uploadState:  'uploading',
    }));

    setCards(prev => [...prev, ...newCards]);

    // 2. Per card: EXIF + background upload — all in parallel
    newCards.forEach(card => {
      // EXIF (non-blocking)
      extractExif(card.file)
        .then(async exif => {
          const patch: Partial<CardState> = {};
          if (exif.date) patch.date = exif.date.toISOString().split('T')[0];
          if (exif.lat != null && exif.lng != null) {
            patch.lat = exif.lat;
            patch.lng = exif.lng;
            try {
              const { reverseGeocode } = await import('@/lib/geocoding');
              const place = await reverseGeocode(exif.lat, exif.lng);
              if (place) patch.locationName = place;
            } catch { /* geocoding is best-effort */ }
          }
          updateCard(card.id, patch);
        })
        .catch(() => { /* EXIF is best-effort */ });

      // Upload (non-blocking)
      uploadFileDirect(card.file)
        .then(url  => updateCard(card.id, { uploadState: 'done',  uploadedUrl: url }))
        .catch(()  => updateCard(card.id, { uploadState: 'error' }));
    });
  }

  // ── Remove card ────────────────────────────────────────────────────────────

  function removeCard(id: string) {
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (card) URL.revokeObjectURL(card.preview);
      return prev.filter(c => c.id !== id);
    });
  }

  // ── Save all ───────────────────────────────────────────────────────────────

  async function handleSaveAll() {
    const current = cardsRef.current;

    if (current.some(c => !c.caption.trim() || !c.date)) {
      setGlobalError('Every memory needs a caption and date.');
      return;
    }
    if (current.some(c => c.uploadState === 'error')) {
      setGlobalError('Some photos failed to upload — remove and re-add them.');
      return;
    }

    setSubmitting(true);
    setGlobalError('');

    try {
      // If any uploads are still in progress, retry them now
      const stillUploading = cardsRef.current.filter(c => c.uploadState === 'uploading');
      if (stillUploading.length > 0) {
        await Promise.all(
          stillUploading.map(card =>
            uploadFileDirect(card.file)
              .then(url => updateCard(card.id, { uploadState: 'done', uploadedUrl: url }))
              .catch(()  => updateCard(card.id, { uploadState: 'error' }))
          )
        );
        // Re-check for errors after retry
        if (cardsRef.current.some(c => c.uploadState === 'error')) {
          setGlobalError('Some photos failed to upload — remove and re-add them.');
          setSubmitting(false);
          return;
        }
      }

      // Save all memories in parallel
      const finalCards = cardsRef.current;
      const results = await Promise.allSettled(
        finalCards.map(card =>
          fetch('/api/memories', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              caption:       card.caption.trim(),
              date:          card.date,
              media_url:     card.uploadedUrl ?? '',
              media_urls:    card.uploadedUrl ? [card.uploadedUrl] : [],
              media_type:    card.file.type.startsWith('video/') ? 'video' : 'photo',
              location_name: card.locationName.trim() || null,
              lat:           card.lat  ?? null,
              lng:           card.lng  ?? null,
              show_on_map:   card.showOnMap,
            }),
          }).then(r => { if (!r.ok) throw new Error('Save failed'); })
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`${failed} memor${failed > 1 ? 'ies' : 'y'} failed to save.`);
      }

      onClose();
      window.location.reload();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const doneCount      = cards.filter(c => c.uploadState === 'done').length;
  const uploadingCount = cards.filter(c => c.uploadState === 'uploading').length;
  const allReady       = cards.length > 0 && uploadingCount === 0;

  // ── Render ─────────────────────────────────────────────────────────────────

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
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-cream w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-rose-deep">Add Memories</h2>
          {cards.length > 0 && (
            <span className="font-sans text-sm text-ink-light">
              {uploadingCount > 0
                ? `Uploading ${doneCount}/${cards.length}…`
                : `${cards.length} photo${cards.length > 1 ? 's' : ''} ready`}
            </span>
          )}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-rose-100 rounded-2xl p-6 text-center
                     cursor-pointer hover:border-rose-medium transition-colors duration-200 mb-6"
        >
          <p className="text-ink-light font-sans text-sm">
            {cards.length === 0 ? '📷  Click to select photos' : '➕  Add more photos'}
          </p>
          <p className="text-ink-light/50 font-sans text-xs mt-1">
            Select multiple — each becomes its own memory card · compressed automatically
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Memory cards */}
        <div className="flex flex-col gap-3 mb-6">
          <AnimatePresence initial={false}>
            {cards.map((card, i) => (
              <MemoryCardRow
                key={card.id}
                card={card}
                index={i}
                onUpdate={patch => updateCard(card.id, patch)}
                onRemove={() => removeCard(card.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Error */}
        {globalError && (
          <p className="text-red-600 font-sans text-sm mb-4">{globalError}</p>
        )}

        {/* Actions */}
        {cards.length > 0 && (
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting
                ? 'Saving…'
                : uploadingCount > 0
                  ? `Uploading… (${doneCount}/${cards.length})`
                  : `Save ${cards.length} Memor${cards.length > 1 ? 'ies' : 'y'}`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Card Row ─────────────────────────────────────────────────────────────────

function MemoryCardRow({
  card,
  index,
  onUpdate,
  onRemove,
}: {
  card:     CardState;
  index:    number;
  onUpdate: (patch: Partial<CardState>) => void;
  onRemove: () => void;
}) {
  const statusMeta: Record<UploadState, { label: string; cls: string }> = {
    uploading: { label: 'Uploading…', cls: 'text-gold-warm animate-pulse' },
    done:      { label: '✓ Ready',    cls: 'text-green-600'               },
    error:     { label: '✗ Failed',   cls: 'text-red-500'                 },
  };

  const { label, cls } = statusMeta[card.uploadState];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{    opacity: 0, scale: 0.95 }}
      className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm"
    >
      {/* Thumbnail */}
      <div className="relative flex-none w-20 h-20 rounded-xl overflow-hidden bg-cream-dark">
        <img src={card.preview} alt="" className="w-full h-full object-cover" />
        {card.uploadState === 'uploading' && (
          <div className="absolute inset-0 bg-ink/20 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <span className={`font-sans text-xs ${cls}`}>{label}</span>

        <textarea
          value={card.caption}
          onChange={e => onUpdate({ caption: e.target.value })}
          rows={2}
          className="form-input text-sm resize-none"
          placeholder="Caption *"
        />

        <div className="flex gap-2">
          <input
            type="date"
            value={card.date}
            onChange={e => onUpdate({ date: e.target.value })}
            className="form-input text-sm flex-1"
          />
          <input
            type="text"
            value={card.locationName}
            onChange={e => onUpdate({ locationName: e.target.value })}
            className="form-input text-sm flex-1"
            placeholder="Location"
          />
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="self-start text-ink-light/40 hover:text-rose-deep transition-colors text-lg leading-none ml-1"
        aria-label="Remove"
      >
        ✕
      </button>
    </motion.div>
  );
}
