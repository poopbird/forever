import type { ExifData } from '@/types';

/**
 * Extracts date and GPS coordinates from a photo file entirely client-side.
 *
 * Privacy note (per PRD): raw GPS coordinates must never be stored beyond
 * what is needed to place the pin. Call reverseGeocode() and discard the
 * raw coords before persisting to the database.
 */
export async function extractExif(file: File): Promise<ExifData> {
  // Dynamic import keeps exifr out of the server bundle
  const exifr = (await import('exifr')).default;

  try {
    const [parsed, gps] = await Promise.all([
      exifr.parse(file, { pick: ['DateTimeOriginal'] }),
      exifr.gps(file).catch(() => null),
    ]);

    return {
      date: parsed?.DateTimeOriginal ?? undefined,
      lat: gps?.latitude ?? undefined,
      lng: gps?.longitude ?? undefined,
    };
  } catch {
    return {};
  }
}
