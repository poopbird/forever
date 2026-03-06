const USER_AGENT = 'ForeverApp/0.1 (couples-memory-poc)';

export interface LocationResult {
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Reverse-geocodes a lat/lng pair to a human-readable place name.
 * Used after EXIF GPS extraction.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&namedetails=1&accept-language=en`,
      { headers: { 'User-Agent': USER_AGENT } },
    );
    if (!res.ok) return null;

    const data = await res.json();
    return buildDisplayName(data);
  } catch {
    return null;
  }
}

/**
 * Forward-geocodes a place name typed by the user into coordinates.
 * Returns the best single match, or null if nothing found.
 */
export async function forwardGeocode(placeName: string): Promise<LocationResult | null> {
  const results = await searchLocations(placeName);
  return results[0] ?? null;
}

/**
 * Searches for locations matching a query string.
 * Returns up to 5 results — used to power the autocomplete dropdown.
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (query.trim().length < 2) return [];

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&namedetails=1&accept-language=en`;

    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return [];

    const data = await res.json();

    return (data as NominatimResult[]).map((item) => ({
      displayName: buildDisplayName(item),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  namedetails?: Record<string, string>;
  address?: Record<string, string>;
}

// ── Formatting ───────────────────────────────────────────────────────────────

/**
 * Builds a human-friendly, specific display name from a Nominatim result.
 *
 * Priority:
 * 1. English name from namedetails (e.g. "Jade Dragon Snow Mountain")
 * 2. The place's own name field
 * 3. Fallback to a trimmed version of display_name
 *
 * Context appended: neighbourhood/suburb → city/town → country
 * so the result reads like "Duxton, Singapore" or
 * "Jade Dragon Snow Mountain, Yunnan, China"
 */
function buildDisplayName(item: NominatimResult): string {
  const addr = item.address ?? {};
  const namedetails = item.namedetails ?? {};

  // 1. Prefer the English name if Nominatim has one
  const placeName =
    namedetails['name:en'] ||
    namedetails['name'] ||
    item.name ||
    '';

  // 2. Build context: the broader area around the place
  const context = buildContext(addr, placeName);

  if (placeName && context) return `${placeName}, ${context}`;
  if (placeName) return placeName;

  // 3. Fallback: first two comma-separated parts of display_name
  return item.display_name?.split(',').slice(0, 2).join(',').trim() ?? '';
}

/**
 * Builds the context string (region + country) to append after the place name.
 * Skips any part that would duplicate the place name itself.
 */
function buildContext(addr: Record<string, string>, placeName: string): string {
  const parts: string[] = [];

  // For specific places (not cities themselves), include the city/region
  const cityLevel =
    addr.city ?? addr.town ?? addr.village ?? addr.municipality;

  const stateLevel = addr.state ?? addr.region ?? addr.province;
  const country = addr.country;

  // Add city if it's not the same as the place name
  if (cityLevel && cityLevel !== placeName) parts.push(cityLevel);
  // Add state only for large countries where it adds clarity (e.g. China, USA, Australia)
  else if (stateLevel && stateLevel !== placeName && shouldIncludeState(country)) {
    parts.push(stateLevel);
  }

  if (country && country !== placeName) parts.push(country);

  return parts.join(', ');
}

/** Countries where the state/province is worth showing for disambiguation */
function shouldIncludeState(country: string | undefined): boolean {
  if (!country) return false;
  const largeCountries = ['China', 'United States', 'United States of America', 'Australia', 'India', 'Canada', 'Brazil', 'Russia'];
  return largeCountries.some((c) => country.includes(c));
}
