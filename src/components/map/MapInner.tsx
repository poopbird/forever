'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Memory } from '@/types';
import PhotoSheet from './PhotoSheet';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cluster {
  lat: number;
  lng: number;
  memories: Memory[];
}

interface MapInnerProps {
  memories: Memory[];
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterMemories(memories: Memory[], radiusKm = 50): Cluster[] {
  const used = new Set<string>();
  const clusters: Cluster[] = [];
  for (const m of memories) {
    if (used.has(m.id) || m.lat == null || m.lng == null) continue;
    const group: Memory[] = [m];
    used.add(m.id);
    for (const n of memories) {
      if (used.has(n.id) || n.lat == null || n.lng == null) continue;
      if (haversineKm(m.lat, m.lng, n.lat, n.lng) <= radiusKm) {
        group.push(n);
        used.add(n.id);
      }
    }
    const lat = group.reduce((s, x) => s + x.lat!, 0) / group.length;
    const lng = group.reduce((s, x) => s + x.lng!, 0) / group.length;
    clusters.push({ lat, lng, memories: group });
  }
  return clusters;
}

// Resolve ISO country code from lat/lng using reverse-geocoding (no API key)
async function getCountryCode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    return d?.address?.country_code?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

// ─── SVG pulse pin icon ────────────────────────────────────────────────────────
function makePinIcon(L: typeof import('leaflet'), count: number) {
  const isSingle = count === 1;
  const size = isSingle ? 36 : 44;
  const html = isSingle
    ? `<div style="
        width:${size}px;height:${size}px;
        background:radial-gradient(circle at 40% 35%, #f5a3b8, #c0394f);
        border:2.5px solid rgba(255,255,255,0.7);
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 4px 18px rgba(192,57,79,0.55), 0 0 0 6px rgba(192,57,79,0.15);
      ">
        <div style="
          position:absolute;inset:5px;
          background:rgba(255,243,240,0.35);
          border-radius:50%;
        "></div>
      </div>`
    : `<div style="
        width:${size}px;height:${size}px;
        background:radial-gradient(circle at 40% 35%, #e8c97a, #c9964a);
        border:2.5px solid rgba(255,255,255,0.7);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 18px rgba(201,150,74,0.55), 0 0 0 6px rgba(201,150,74,0.15);
        font-family:'Lato',sans-serif;
        font-size:13px;font-weight:700;
        color:rgba(60,30,10,0.92);
      ">${count}</div>`;

  return L.divIcon({
    html,
    className: '',
    iconSize:   [size, size],
    iconAnchor: isSingle ? [size / 2, size] : [size / 2, size / 2],
    popupAnchor:[0, -size],
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MapInner({ memories }: MapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<import('leaflet').Map | null>(null);
  const [sheet, setSheet] = useState<Memory[] | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Trigger reveal when map scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleClusterClick = useCallback((cluster: Cluster) => {
    const photos = cluster.memories.filter(m => m.media_url && m.media_type === 'photo');
    if (photos.length > 0) setSheet(photos);
  }, []);

  useEffect(() => {
    if (!containerRef.current || memories.length === 0 || !revealed) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      if (containerRef.current!.querySelector('.leaflet-container')) return;

      const map = L.map(containerRef.current!, {
        zoomControl:       false,
        attributionControl: false,
      }).setView([20, 10], 2);

      mapRef.current = map;

      // ── Dark tiles ──────────────────────────────────────────────────────────
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom:    19,
      }).addTo(map);

      // Subtle attribution
      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© <a href="https://carto.com" style="color:#666">CARTO</a>')
        .addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      if (cancelled) return;

      // ── Sorted memories ─────────────────────────────────────────────────────
      const sorted = [...memories]
        .filter(m => m.lat != null && m.lng != null)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (sorted.length === 0) return;

      // ── Step 1: Country glow (choropleth) ───────────────────────────────────
      // Collect unique country codes per memory (throttled to avoid rate-limit)
      const countryCodes = new Map<string, number>(); // code → timestamp of first memory
      const seenCoords   = new Map<string, string>();  // "lat,lng" → code cache

      for (const m of sorted) {
        const key = `${m.lat!.toFixed(1)},${m.lng!.toFixed(1)}`;
        let code  = seenCoords.get(key) ?? null;
        if (!code) {
          await new Promise(r => setTimeout(r, 120)); // throttle Nominatim
          if (cancelled) return;
          code = await getCountryCode(m.lat!, m.lng!);
          if (code) seenCoords.set(key, code);
        }
        if (code && !countryCodes.has(code)) {
          countryCodes.set(code, new Date(m.date).getTime());
        }
      }

      if (cancelled) return;

      // Load world TopoJSON + draw glowing countries
      const [topoModule, worldData] = await Promise.all([
        import('topojson-client'),
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json()),
      ]);

      if (cancelled) return;

      const { feature } = topoModule;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geojson = feature(worldData as any, (worldData as any).objects.countries) as unknown as GeoJSON.FeatureCollection;

      // ISO numeric → alpha-2 lookup built from our set (Nominatim gives alpha-2,
      // world-atlas uses numeric). We match via a fetch to restcountries.
      const numericToAlpha2 = new Map<string, string>();
      try {
        const ccRes = await fetch('https://restcountries.com/v3.1/all?fields=cca2,ccn3');
        const ccData: Array<{ cca2: string; ccn3: string }> = await ccRes.json();
        for (const c of ccData) numericToAlpha2.set(c.ccn3, c.cca2);
      } catch { /* skip if offline */ }

      if (cancelled) return;

      // Reveal countries one-by-one with stagger
      const visitedNumerics = geojson.features.filter(f => {
        const numeric = String(f.id ?? '').padStart(3, '0');
        const alpha2  = numericToAlpha2.get(numeric);
        return alpha2 && countryCodes.has(alpha2);
      });

      for (let i = 0; i < visitedNumerics.length; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 400));

        L.geoJSON(visitedNumerics[i], {
          style: {
            fillColor:   '#c9964a',
            fillOpacity: 0.22,
            color:       '#e8c97a',
            weight:      1.2,
            opacity:     0.55,
          },
        }).addTo(map);
      }

      if (cancelled) return;

      // ── Step 2: Animated route polyline ─────────────────────────────────────
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;

      const latlngs: [number, number][] = sorted.map(m => [m.lat!, m.lng!]);

      const routeLine = L.polyline([], {
        color:     '#e8c97a',
        weight:    2,
        opacity:   0.65,
        dashArray: '6 8',
      }).addTo(map);

      // Draw the line incrementally
      for (let i = 0; i < latlngs.length; i++) {
        if (cancelled) return;
        routeLine.addLatLng(latlngs[i]);
        await new Promise(r => setTimeout(r, 80));
      }

      // Fit bounds to memories
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.3), { animate: true, duration: 1.2 });

      // ── Step 3: Drop pins ────────────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;

      const clusters = clusterMemories(sorted, 50);

      for (let i = 0; i < clusters.length; i++) {
        if (cancelled) return;
        const cluster = clusters[i];
        const icon    = makePinIcon(L, cluster.memories.length);
        const marker  = L.marker([cluster.lat, cluster.lng], { icon });

        marker.on('click', () => handleClusterClick(cluster));
        marker.addTo(map);

        await new Promise(r => setTimeout(r, 120));
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memories, revealed]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ height: '520px', width: '100%', background: '#1a1a2e' }}
      />
      {sheet && (
        <PhotoSheet
          photos={sheet}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
