'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { extractExif } from '@/lib/exif';
import { reverseGeocode } from '@/lib/geocoding';
import LocationInput from './LocationInput';
import type { Memory } from '@/types';

interface MemoryFormProps {
  /** Pass a memory to enable edit mode */
  memory?: Memory;
  onClose: () => void;
}

export default function MemoryForm({ memory, onClose }: MemoryFormProps) {
  const isEditing = !!memory;
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState(memory?.caption ?? '');
  const [date, setDate] = useState(memory?.date ?? '');
  const [locationName, setLocationName] = useState(memory?.location_name ?? '');
  const [lat, setLat] = useState<number | undefined>(memory?.lat ?? undefined);
  const [lng, setLng] = useState<number | undefined>(memory?.lng ?? undefined);
  const [showOnMap, setShowOnMap] = useState(memory?.show_on_map ?? true);
  const [milestoneLabel, setMilestoneLabel] = useState(memory?.milestone_label ?? '');

  const [exifLoading, setExifLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setExifLoading(true);

    try {
      const exif = await extractExif(f);

      if (exif.date) {
        setDate(exif.date.toISOString().split('T')[0]);
      }

      if (exif.lat != null && exif.lng != null) {
        setLat(exif.lat);
        setLng(exif.lng);
        // Reverse-geocode to a human-readable place name
        const place = await reverseGeocode(exif.lat, exif.lng);
        if (place) setLocationName(place);
      }
    } finally {
      setExifLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() || !date) {
      setError('Caption and date are required.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      let mediaUrl = memory?.media_url ?? '';

      // Upload new media if a file was selected
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          const { error: msg } = await uploadRes.json();
          throw new Error(msg ?? 'Upload failed');
        }
        ({ url: mediaUrl } = await uploadRes.json());
      }

      const payload = {
        caption: caption.trim(),
        date,
        media_url: mediaUrl,
        media_type: file?.type.startsWith('video/') ? 'video' : 'photo',
        location_name: locationName.trim() || null,
        lat: lat ?? null,
        lng: lng ?? null,
        show_on_map: showOnMap,
        milestone_label: milestoneLabel.trim() || null,
      };

      const res = await fetch(
        isEditing ? `/api/memories/${memory!.id}` : '/api/memories',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? 'Save failed');
      }

      onClose();
      // Simple full-page refresh for the POC — replace with router.refresh() if adding SWR/React Query
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

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

        {/* ── File picker ── */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-rose-100 rounded-2xl p-6 text-center
                     cursor-pointer hover:border-rose-medium transition-colors duration-200 mb-4"
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="max-h-44 mx-auto rounded-xl object-cover"
            />
          ) : (
            <>
              <p className="text-ink-light font-sans text-sm">
                Click to upload a photo or video
              </p>
              <p className="text-ink-light/50 font-sans text-xs mt-1">
                Date & location will be read from EXIF automatically
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
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
              onCoordinatesFound={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
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
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Memory'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
