'use client';

import { createClient } from '@/lib/supabase/client';

const COMPRESS_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
};

/**
 * Compresses an image client-side then uploads directly to Supabase Storage.
 * Bypasses the Next.js /api/upload proxy for faster uploads (one network hop).
 * Videos are uploaded as-is (no compression).
 */
export async function uploadFileDirect(file: File): Promise<string> {
  const supabase = createClient();

  let fileToUpload: File = file;

  if (file.type.startsWith('image/')) {
    const { default: imageCompression } = await import('browser-image-compression');
    fileToUpload = await imageCompression(file, COMPRESS_OPTIONS);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('memories')
    .upload(path, fileToUpload, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('memories').getPublicUrl(path);
  return data.publicUrl;
}
