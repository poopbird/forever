/**
 * Returns a Supabase Storage URL with image transform parameters applied.
 * Transforms are applied at the CDN level — the original file is never modified.
 *
 * Usage:
 *   storageUrl(memory.media_url, { width: 400, quality: 75 })
 *
 * Non-Supabase URLs (e.g. external images) are returned unchanged.
 */
export function storageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number } = {},
): string {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/public/')) return url;

  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );

  const params = new URLSearchParams();
  if (opts.width)   params.set('width',   String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));
  // 'contain' resizes proportionally without cropping; CSS objectFit handles the rest
  params.set('resize', 'contain');

  const qs = params.toString();
  return qs ? `${transformed}?${qs}` : transformed;
}
