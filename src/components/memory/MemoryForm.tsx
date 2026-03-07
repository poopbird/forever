'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { extractExif } from '@/lib/exif';
import { reverseGeocode } from '@/lib/geocoding';
import LocationInput from './LocationInput';
import type { Memory } from '@/types';

interface MemoryFormProps {
  memory?: Memory;
  onClose: () => void;
}

export default function MemoryForm({ memory, onClose }: MemoryFormProps) {
  const isEditing = !!memory;
  const fileRef   = useRef<HTMLInputElement>(null);

  // ── Multi-image state ────────────────────────────────────────────────────
  // New files selected this session
  const [files,    setFiles]    = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  // Existing URLs when editing
  const [existingUrls, setExistingUrls] = useState<string[]>(
    memory?.media_urls?.length
      ? memory.media_urls
      : memory?.media_url
        ? [memory.media_url]
        : []
  );

  // ── Other fields ─────────────────────────────────────────────────────────
  const [caption,        setCaption]        = useState(memory?.caption        ?? '');
  const [date,           setDate]           = useState(memory?.date           ?? '');
  const [locationName,   setLocationName]   = useState(memory?.location_name  ?? '');
  const [lat,            setLat]            = useState<number | undefined>(memory?.lat ?? undefined);
  const [lng,            setLng]            = useState<number | undefined>(memory?.lng ?? undefined);
  const [showOnMap,      setShowOnMap]      = useState(memory?.show_on_map    ?? true);
  const [milestoneLabel, setMilestoneLabel] = useState(memory?.milestone_label ?? '');
  const [dotEmoji,       setDotEmoji]       = useState(memory?.dot_emoji      ?? '');

  const [exifLoading, setExifLoading] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  // ── Add files ────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    // Reset input so same files can be re-added if needed
    e.target.value = '';

    const newPreviews = selected.map(f => URL.createObjectURL(f));
    const isFirst     = files.length === 0 && existingUrls.length === 0;

    setFiles(prev    => [...prev,    ...selected]);
    setPreviews(prev => [...prev,    ...newPreviews]);

    // Auto-fill date + location from EXIF only when this is the very first image
    if (isFirst) {
      setExifLoading(true);
      try {
        const exif = await extractExif(selected[0]);
        if (exif.date) setDate(exif.date.toISOString().split('T')[0]);
        if (exif.lat != null && exif.lng != null) {
          setLat(exif.lat);
          setLng(exif.lng);
          const place = await reverseGeocode(exif.lat, exif.lng);
          if (place) setLocationName(place);
        }
      } finally {
        setExifLoading(false);
      }
    }
  }

  function removeNewFile(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles(prev    => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  function removeExistingUrl(i: number) {
    setExistingUrls(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() || !date) {
      setError('Caption and date are required.');
      return;
    }
    if (existingUrls.length === 0 && files.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      // Upload all new files
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg ?? 'Upload failed');
        }
        const { url } = await res.json();
        uploadedUrls.push(url);
      }

      // Final list = kept existing + newly uploaded
      const allUrls = [...existingUrls, ...uploadedUrls];

      const payload = {
        caption:         caption.trim(),
        date,
        media_url:       allUrls[0] ?? '',
        media_urls:      allUrls,
        media_type:      files.some(f => f.type.startsWith('video/')) ? 'video' : 'photo',
        location_name:   locationName.trim() || null,
        lat:             lat  ?? null,
        lng:             lng  ?? null,
        show_on_map:     showOnMap,
        milestone_label: milestoneLabel.trim() || null,
        dot_emoji:       dotEmoji || null,
      };

      const res = await fetch(
        isEditing ? `/api/memories/${memory!.id}` : '/api/memories',
        {
          method:  isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? 'Save failed');
      }

      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalCount = existingUrls.length + files.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-cream w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-8"
      >
        <h2 className="font-serif text-2xl text-rose-deep mb-6">
          {isEditing ? 'Edit Memory' : 'Add a Memory'}
        </h2>

        {/* ── Photo grid ── */}
        <div className="mb-4">
          {/* Existing + new previews */}
          {totalCount > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Existing URLs (editing) */}
              <AnimatePresence>
                {existingUrls.map((url, i) => (
                  <motion.div
                    key={`existing-${i}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-cream-dark group"
                  >
                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" />
                    <button
                      type="button"
                      onClick={() => removeExistingUrl(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/70 text-white
                                 text-[10px] flex items-center justify-center
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 font-sans text-[9px] font-bold
                                       text-white bg-rose-deep/80 px-1.5 py-0.5 rounded-full">
                        Cover
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* New file previews */}
              <AnimatePresence>
                {previews.map((src, i) => (
                  <motion.div
                    key={`new-${i}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-cream-dark group"
                  >
                    <img src={src} alt={`New ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/70 text-white
                                 text-[10px] flex items-center justify-center
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    {existingUrls.length === 0 && i === 0 && (
                      <span className="absolute bottom-1 left-1 font-sans text-[9px] font-bold
                                       text-white bg-rose-deep/80 px-1.5 py-0.5 rounded-full">
                        Cover
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Upload button / drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-rose-100 rounded-2xl p-5 text-center
                       cursor-pointer hover:border-rose-medium transition-colors duration-200"
          >
            <p className="text-ink-light font-sans text-sm">
              {totalCount === 0 ? '📷  Click to upload photos' : '➕  Add more photos'}
            </p>
            {totalCount === 0 && (
              <p className="text-ink-light/50 font-sans text-xs mt-1">
                Select multiple — date & location from first photo's EXIF
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {exifLoading && (
          <p className="text-center text-xs text-gold-warm font-sans animate-pulse mb-2">
            Reading photo metadata…
          </p>
        )}

        {/* ── Caption ── */}
        <label className="block mb-4">
          <span className="form-label">Caption *</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="form-input mt-1"
            placeholder="Describe this moment…"
            required
          />
        </label>

        {/* ── Date ── */}
        <label className="block mb-4">
          <span className="form-label">Date *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input mt-1"
            required
          />
        </label>

        {/* ── Location ── */}
        <div className="block mb-4">
          <span className="form-label">Location</span>
          <div className="mt-1">
            <LocationInput
              value={locationName}
              onChange={setLocationName}
              onCoordinatesFound={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
            />
          </div>
          {lat && lng && (
            <p className="text-xs text-gold-warm font-sans mt-1">
              ✓ Coordinates found — will appear on map
            </p>
          )}
        </div>

        {/* ── Milestone label ── */}
        <label className="block mb-4">
          <span className="form-label">Milestone label</span>
          <input
            type="text"
            value={milestoneLabel}
            onChange={(e) => setMilestoneLabel(e.target.value)}
            className="form-input mt-1"
            placeholder="e.g. First Holiday, Got a Dog, Engaged 🎉"
          />
        </label>

        {/* ── Dot icon ── */}
        <div className="mb-4">
          <span className="form-label block mb-2">Timeline dot icon</span>
          <div className="flex flex-wrap gap-2">
            {['❤️','💛','⭐','📷','✈️','💍','🌸','🏠','🎉','🐾','🎂','🌊'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDotEmoji(dotEmoji === emoji ? '' : emoji)}
                className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border-2 transition-colors ${
                  dotEmoji === emoji
                    ? 'border-rose-deep bg-rose-blush/40'
                    : 'border-rose-100 hover:border-rose-medium'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          {dotEmoji && (
            <button
              type="button"
              onClick={() => setDotEmoji('')}
              className="text-xs text-ink-light mt-2 underline underline-offset-2"
            >
              Clear selection
            </button>
          )}
          <p className="text-xs text-ink-light/60 mt-1 font-sans">
            Shown on the timeline dot for this memory
          </p>
        </div>

        {/* ── Show on map ── */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnMap}
            onChange={(e) => setShowOnMap(e.target.checked)}
            className="accent-rose-deep w-4 h-4"
          />
          <span className="font-sans text-sm text-ink">Show on map</span>
        </label>

        {error && (
          <p className="text-red-600 font-sans text-sm mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting
              ? `Uploading ${files.length > 0 ? `${files.length} photo${files.length > 1 ? 's' : ''}…` : '…'}`
              : isEditing ? 'Save Changes' : 'Add Memory'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
