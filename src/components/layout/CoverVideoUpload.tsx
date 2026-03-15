'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  currentVideoUrl: string | null;
}

export default function CoverVideoUpload({ currentVideoUrl }: Props) {
  const [open,       setOpen]       = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState('');
  const [error,      setError]      = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange
    e.target.value = '';
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file (mp4, mov, webm…)');
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      setError('Video must be under 150 MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress('Uploading video…');

    try {
      // 1 — Upload to Supabase storage
      const form = new FormData();
      form.append('file', file);
      const uploadRes  = await fetch('/api/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();           // consume body once
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed');
      const { url } = uploadData as { url: string };

      // 2 — Save URL to site_config
      setProgress('Saving…');
      const saveRes  = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cover_video_url', value: url }),
      });
      const saveData = await saveRes.json();               // consume body once
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Save failed');

      setProgress('Done! Reloading…');
      // Reload to show the new video
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setUploading(false);
      setProgress('');
    }
  }

  async function handleRemove() {
    setUploading(true);
    setError('');
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cover_video_url', value: null }),
      });
      window.location.reload();
    } catch {
      setError('Failed to remove video');
      setUploading(false);
    }
  }

  return (
    <>
      {/* ── Trigger button — sits in the hero top-right ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Change cover video"
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5
                   rounded-full text-white/70 hover:text-white font-sans text-xs tracking-wide
                   border border-white/20 hover:border-white/50 bg-black/20 hover:bg-black/35
                   backdrop-blur-sm transition-all duration-200"
      >
        🎬 <span>Change video</span>
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
            onClick={() => !uploading && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              className="bg-cream rounded-3xl shadow-2xl p-8 w-full max-w-md"
            >
              <h2 className="font-serif text-2xl text-ink mb-1">Cover Video</h2>
              <p className="font-sans text-sm text-ink-light mb-6">
                Upload a short looping video (mp4 recommended, max 150 MB).
                It will play silently behind the hero.
              </p>

              {/* Current video preview */}
              {currentVideoUrl && (
                <div className="mb-5 rounded-xl overflow-hidden bg-cream-dark relative">
                  <video
                    src={currentVideoUrl}
                    muted autoPlay loop playsInline
                    className="w-full h-36 object-cover"
                  />
                  <button
                    onClick={handleRemove}
                    disabled={uploading}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70
                               text-white text-xs flex items-center justify-center transition"
                    aria-label="Remove video"
                  >
                    ✕
                  </button>
                  <p className="text-[10px] text-ink-light/60 font-sans text-center py-1">
                    Current video — click ✕ to remove
                  </p>
                </div>
              )}

              {/* File input */}
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFile}
              />

              {uploading ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-rose-deep border-t-transparent
                                  rounded-full animate-spin mx-auto mb-3" />
                  <p className="font-sans text-sm text-ink-light">{progress}</p>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-rose-100
                             hover:border-rose-medium text-ink-light hover:text-ink
                             font-sans text-sm transition-colors duration-200 bg-white/50"
                >
                  📁 Choose video file
                </button>
              )}

              {error && (
                <p className="mt-3 text-xs font-sans text-rose-deep text-center">{error}</p>
              )}

              {!uploading && (
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full text-center text-xs text-ink-light/60 hover:text-ink-light
                             font-sans underline underline-offset-2 transition-colors"
                >
                  Cancel
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
