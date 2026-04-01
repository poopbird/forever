'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Memory }          from '@/types';
import type { InvitationTheme } from '@/lib/couple';
import PhotoSheet               from '@/components/map/PhotoSheet';
import type * as ThreeTypes     from 'three';

// ── Per-theme colour tokens ────────────────────────────────────────────────────
const THEME_COLORS = {
  polaroid_white: {
    oceanColor:      0x2a2014,
    landColor:       0x3a3020,
    borderColor:     0x6b5830,
    visitedColor:    0x8b7355,
    glowColor:       0xb48230,
    atmosphereColor: 0xc8a870,
    bgColor:         '#1c1810',
  },
  garden_bloom: {
    oceanColor:      0x1a1810,
    landColor:       0x2a2818,
    borderColor:     0x5a3830,
    visitedColor:    0x7b5556,
    glowColor:       0x9c5050,
    atmosphereColor: 0xc08080,
    bgColor:         '#121510',
  },
  sage_linen: {
    oceanColor:      0x181c14,
    landColor:       0x242c1c,
    borderColor:     0x3a4830,
    visitedColor:    0x566252,
    glowColor:       0x607060,
    atmosphereColor: 0x90a888,
    bgColor:         '#111410',
  },
  midnight_indigo: {
    oceanColor:      0x0a0e1e,
    landColor:       0x1a2240,
    borderColor:     0x3a4870,
    visitedColor:    0x5b72bb,
    glowColor:       0x8899ee,
    atmosphereColor: 0x8899dd,
    bgColor:         '#060810',
  },
} as const;

// ── Geo helpers ────────────────────────────────────────────────────────────────
function latLngToVec3(lat: number, lng: number, r = 1): [number, number, number] {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  ];
}

// ── Strip duplicate GeoJSON closing point ─────────────────────────────────────
function cleanRing(ring: [number, number][]): [number, number][] {
  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  return closed ? ring.slice(0, -1) : [...ring];
}

// ── Winding-number point-in-polygon (non-zero rule — fills self-intersecting) ─
function isLeft(
  p0: [number, number], p1: [number, number], p2: [number, number],
): number {
  return (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]);
}

function windingNumber(x: number, y: number, ring: [number, number][]): number {
  let wn = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    if (ring[i][1] <= y) {
      if (ring[j][1] > y && isLeft(ring[i], ring[j], [x, y]) > 0) wn++;
    } else {
      if (ring[j][1] <= y && isLeft(ring[i], ring[j], [x, y]) < 0) wn--;
    }
  }
  return wn;
}


// ── Winding-number PIP with longitude wraparound ────────────────────────────
// For dateline-crossing polygons, the standard winding-number test breaks
// because planar isLeft gives wrong results when the test point and edge
// vertices are on opposite sides of the 360° wrap.  This version wraps
// vertex i near the test point, then vertex j near vertex i, so each
// edge is short and the planar cross-product is geometrically correct.
function windingNumberWrapped(x: number, y: number, ring: [number, number][]): number {
  let wn = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    // Wrap vertex i to within ±180° of the test point
    let xi = ring[i][0];
    while (xi - x > 180) xi -= 360;
    while (xi - x < -180) xi += 360;
    // Wrap vertex j to within ±180° of vertex i (keeps edge short)
    let xj = ring[j][0];
    while (xj - xi > 180) xj -= 360;
    while (xj - xi < -180) xj += 360;

    const yi = ring[i][1], yj = ring[j][1];
    if (yi <= y) {
      if (yj > y && isLeft([xi, yi], [xj, yj], [x, y]) > 0) wn++;
    } else {
      if (yj <= y && isLeft([xi, yi], [xj, yj], [x, y]) < 0) wn--;
    }
  }
  return wn;
}

// ── Signed area from array of [x,y] pairs (positive = CCW) ──────────────────
function signedArea2D(pts: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return sum / 2;
}

// ── Grid-based fill for large / dateline-crossing polygons ──────────────────
// Creates a grid of small triangles (~1–2°) across the polygon's extent, keeps
// only those whose centre is inside the polygon (winding-number, non-zero rule).
// Small triangles hug the sphere surface and avoid the "flat triangle dips below
// the sphere" artefact that makes conventional triangulations invisible for
// countries spanning > 15°.  Also handles dateline-crossing polygons by
// normalising longitudes into a continuous range before gridding.
function buildGridFill(
  THREE: typeof ThreeTypes,
  outer: [number, number][],
  holes: [number, number][][],
  radius: number,
): ThreeTypes.BufferGeometry | null {
  // ── Detect dateline crossing and normalise longitudes ──────────────────
  // If consecutive vertices jump > 180° in longitude the polygon wraps the
  // antimeridian.  Shift negative longitudes up by 360 so the ring sits in
  // a continuous range (e.g. 130 … 190 instead of 130 … -170).
  let crossesDateline = false;
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    if (Math.abs(outer[j][0] - outer[i][0]) > 180) { crossesDateline = true; break; }
  }

  const norm: [number, number][] = crossesDateline
    ? outer.map(([x, y]) => [x < 0 ? x + 360 : x, y] as [number, number])
    : outer;
  const normHoles = crossesDateline
    ? holes.map(h => h.map(([x, y]) => [x < 0 ? x + 360 : x, y] as [number, number]))
    : holes;

  // Bounding box (in normalised space)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of norm) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Adaptive resolution: smaller cells for smaller polygons, cap at 2° for huge ones
  const span = Math.max(maxX - minX, maxY - minY);
  const step = Math.max(0.4, Math.min(2.0, span / 40));

  const positions: number[] = [];
  const indices: number[] = [];

  // ── Detect polar polygon ──────────────────────────────────────────────
  // Antarctica's ring in 110m TopoJSON crosses the dateline.  After
  // normalisation the closing edge (last → first vertex) can span ~355°
  // of longitude, corrupting the standard winding-number test.  For
  // polar polygons we use rayCastPIP which skips long artifact edges.
  // We also extend the grid to the pole (−90° / +90°) since the polygon
  // vertices don't reach all the way there but the land does.
  const lngSpan = maxX - minX;
  const isSouthPolar = minY < -70 && lngSpan > 300;
  const isNorthPolar = maxY >  70 && lngSpan > 300;

  if (isSouthPolar) {
    // Antarctica: grid from −90° to maxY, using windingNumberWrapped
    // which handles the 360° longitude wraparound correctly.
    const capStep = step;
    for (let x = 0; x < 360; x += capStep) {
      for (let y = -90; y < maxY; y += capStep) {
        const cx = x + capStep / 2;
        const cy = y + capStep / 2;

        if (windingNumberWrapped(cx, cy, norm) === 0) continue;

        // Exclude holes
        let inHole = false;
        for (const hole of normHoles) {
          if (windingNumber(cx, cy, hole) !== 0) { inHole = true; break; }
        }
        if (inHole) continue;

        const base = positions.length / 3;
        const x1 = x, y1 = y, x2 = x + capStep, y2 = Math.min(y + capStep, maxY);
        for (const [px, py] of [[x1,y1],[x2,y1],[x2,y2],[x1,y2]] as [number,number][]) {
          const lng = px > 180 ? px - 360 : px;
          const [vx, vy, vz] = latLngToVec3(py, lng, radius);
          positions.push(vx, vy, vz);
        }
        indices.push(base, base+1, base+2, base, base+2, base+3);
      }
    }
  } else if (isNorthPolar) {
    // Analogous for north-polar polygons
    const capStep = step;
    for (let x = 0; x < 360; x += capStep) {
      for (let y = minY; y < 90; y += capStep) {
        const cx = x + capStep / 2;
        const cy = y + capStep / 2;
        if (windingNumberWrapped(cx, cy, norm) === 0) continue;
        let inHole = false;
        for (const hole of normHoles) {
          if (windingNumber(cx, cy, hole) !== 0) { inHole = true; break; }
        }
        if (inHole) continue;
        const base = positions.length / 3;
        const x1 = x, y1 = y, x2 = x + capStep, y2 = Math.min(y + capStep, 90);
        for (const [px, py] of [[x1,y1],[x2,y1],[x2,y2],[x1,y2]] as [number,number][]) {
          const lng = px > 180 ? px - 360 : px;
          const [vx, vy, vz] = latLngToVec3(py, lng, radius);
          positions.push(vx, vy, vz);
        }
        indices.push(base, base+1, base+2, base, base+2, base+3);
      }
    }
  } else {
    // ── Standard grid fill for non-polar polygons ─────────────────────────
    // Use windingNumberWrapped for dateline-crossing polygons (e.g. Russia)
    // since the standard test breaks with 360° coordinate wraparound.
    const pip = crossesDateline
      ? (cx: number, cy: number, r: [number, number][]) => windingNumberWrapped(cx, cy, r)
      : (cx: number, cy: number, r: [number, number][]) => windingNumber(cx, cy, r);

    for (let x = minX; x < maxX; x += step) {
      for (let y = minY; y < maxY; y += step) {
        const cx = x + step / 2;
        const cy = y + step / 2;

        if (pip(cx, cy, norm) === 0) continue;

        // Exclude if inside any hole
        let inHole = false;
        for (const hole of normHoles) {
          if (pip(cx, cy, hole) !== 0) { inHole = true; break; }
        }
        if (inHole) continue;

        // Add two triangles for this grid cell
        const base = positions.length / 3;
        const x1 = x, y1 = y, x2 = x + step, y2 = y + step;
        for (const [px, py] of [[x1,y1],[x2,y1],[x2,y2],[x1,y2]] as [number,number][]) {
          // Convert normalised longitude back to [-180,180] for latLngToVec3
          const lng = px > 180 ? px - 360 : px;
          const [vx, vy, vz] = latLngToVec3(py, lng, radius);
          positions.push(vx, vy, vz);
        }
        indices.push(base, base+1, base+2, base, base+2, base+3);
      }
    }
  }

  if (indices.length < 3) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ── Fill geometry for one GeoJSON Polygon (outer ring + optional holes) ───────
// Small polygons (< 15° span): ear-clip triangulation (earcut → ShapeUtils).
// Large polygons (≥ 15° span): grid fill — flat triangles spanning many degrees
// dip below the sphere surface and get occluded by the ocean sphere, so we must
// use small grid cells that hug the surface.
function buildPolygonFill(
  THREE: typeof ThreeTypes,
  earcutFn: (coords: number[], holes?: number[], dim?: number) => number[],
  outerRaw: GeoJSON.Position[],
  holeRaws: GeoJSON.Position[][],
  radius: number,
): ThreeTypes.BufferGeometry | null {
  try {
    const outer = cleanRing(outerRaw.map(p => [p[0], p[1]] as [number, number]));
    if (outer.length < 3) return null;

    const holes = holeRaws
      .map(h => cleanRing(h.map(p => [p[0], p[1]] as [number, number])))
      .filter(h => h.length >= 3);

    // Enforce CCW outer ring (positive signed area)
    const outerArea = signedArea2D(outer);
    if (outerArea < 0) outer.reverse();

    // Enforce CW holes (negative signed area)
    for (const hole of holes) {
      if (signedArea2D(hole) > 0) hole.reverse();
    }

    // ── Check polygon extent ─────────────────────────────────────────────────
    // Large polygons (> 15° in any dimension) need grid fill so that every
    // triangle is small enough to stay flush with the sphere surface.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of outer) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const lngSpan = maxX - minX;
    const latSpan = maxY - minY;

    // A flat triangle spanning D° sags below the sphere by (1 - cos(D/2)).
    // At D=5° the sag is ~0.004 — larger than the 0.001–0.003 fill offset,
    // so the ocean sphere occludes the fill.  Use grid fill for any polygon
    // wider than 2° to guarantee every cell hugs the sphere surface.
    if (lngSpan > 2 || latSpan > 2) {
      return buildGridFill(THREE, outer, holes, radius);
    }

    // ── Small polygon: conventional triangulation ────────────────────────────
    const allPts: [number, number][] = [...outer];
    for (const hole of holes) allPts.push(...hole);

    let triIndices: number[] = [];

    // Try earcut first (fast, handles simple polygons well)
    const flatCoords: number[] = [];
    for (const [lo, la] of outer) flatCoords.push(lo, la);
    const holeIndices: number[] = [];
    for (const hole of holes) {
      holeIndices.push(flatCoords.length / 2);
      for (const [lo, la] of hole) flatCoords.push(lo, la);
    }
    const earcutResult = earcutFn(
      flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2,
    );
    if (earcutResult && earcutResult.length >= 3) {
      triIndices = Array.from(earcutResult);
    }

    // Fallback to ShapeUtils
    if (triIndices.length < 3) {
      const outerVec2 = outer.map(([x, y]) => new THREE.Vector2(x, y));
      const holeVec2s = holes.map(h => h.map(([x, y]) => new THREE.Vector2(x, y)));
      try {
        const faces = THREE.ShapeUtils.triangulateShape(outerVec2, holeVec2s);
        if (faces && faces.length > 0) {
          for (const [a, b, c] of faces) triIndices.push(a, b, c);
        }
      } catch { /* ShapeUtils can throw on degenerate input */ }
    }

    if (triIndices.length < 3) return null;

    // Build 3D sphere positions
    const positions: number[] = [];
    for (const [lo, la] of allPts) {
      const [x, y, z] = latLngToVec3(la, lo, radius);
      positions.push(x, y, z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(triIndices);
    geo.computeVertexNormals();
    return geo;
  } catch {
    return null;
  }
}

// ── Border line geometry for a single ring ────────────────────────────────────
function buildBorderLine(
  THREE: typeof ThreeTypes,
  raw: GeoJSON.Position[],
  radius: number,
  mat: ThreeTypes.LineBasicMaterial,
): ThreeTypes.Line {
  const pts: number[] = [];
  for (const p of raw) {
    const [x, y, z] = latLngToVec3(p[1], p[0], radius);
    pts.push(x, y, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.Line(geo, mat);
}

// ── Country fill mesh builder ──────────────────────────────────────────────────
function buildCountryMesh(
  THREE: typeof ThreeTypes,
  earcutFn: (coords: number[], holes?: number[], dim?: number) => number[],
  feature: GeoJSON.Feature,
  radius: number,
  material: ThreeTypes.Material,
): ThreeTypes.Mesh | null {
  const geom = feature.geometry;
  if (!geom) return null;

  const geos: ThreeTypes.BufferGeometry[] = [];

  const processPolygon = (coords: GeoJSON.Position[][]) => {
    const outer = coords[0];
    const holes = coords.slice(1);
    const geo = buildPolygonFill(THREE, earcutFn, outer, holes, radius);
    if (geo) geos.push(geo);
  };

  if (geom.type === 'Polygon') {
    processPolygon(geom.coordinates);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) processPolygon(poly);
  } else {
    return null;
  }

  if (geos.length === 0) return null;
  if (geos.length === 1) return new THREE.Mesh(geos[0], material);

  // Merge multiple indexed geometries into one
  let totalVerts = 0;
  for (const g of geos) {
    totalVerts += (g.getAttribute('position') as ThreeTypes.BufferAttribute).count;
  }
  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedIdx: number[] = [];
  let vOff = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position') as ThreeTypes.BufferAttribute;
    const arr = pos.array as Float32Array;
    mergedPos.set(arr, vOff * 3);
    if (g.index) {
      const idxArr = g.index.array as Uint16Array | Uint32Array;
      for (let i = 0; i < idxArr.length; i++) mergedIdx.push(idxArr[i] + vOff);
    }
    vOff += pos.count;
  }
  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(mergedPos, 3));
  mergedGeo.setIndex(mergedIdx);
  mergedGeo.computeVertexNormals();
  return new THREE.Mesh(mergedGeo, material);
}

// ── Add border lines for all country rings ────────────────────────────────────
function addCountryBorders(
  THREE: typeof ThreeTypes,
  geojson: GeoJSON.FeatureCollection,
  globeGroup: ThreeTypes.Group,
  radius: number,
  color: number,
) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 });

  for (const feat of geojson.features) {
    const geom = feat.geometry;
    if (!geom) continue;

    const rings: GeoJSON.Position[][] = [];
    if (geom.type === 'Polygon') {
      rings.push(...geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) rings.push(...poly);
    }

    for (const ring of rings) {
      if (ring.length < 2) continue;
      globeGroup.add(buildBorderLine(THREE, ring, radius, mat));
    }
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  memories:        Memory[];
  invitationTheme: InvitationTheme;
}

export default function GlobeInner({ memories, invitationTheme }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<Memory[] | null>(null);

  const onClickCountry = useCallback((countryCode: string) => {
    const photos = memories.filter(
      m =>
        m.media_url &&
        m.media_type === 'photo' &&
        (m as unknown as Record<string, unknown>).country_code === countryCode,
    );
    if (photos.length > 0) setSheet(photos);
  }, [memories]);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    let cancelled = false;
    let animId    = 0;

    (async () => {
      // Lazy-import Three.js + earcut — downloaded only when this component mounts
      const [THREE, earcutMod] = await Promise.all([
        import('three'),
        import('earcut'),
      ]);
      const earcutFn = earcutMod.default;

      if (cancelled) return;

      const tc = THEME_COLORS[invitationTheme] ?? THEME_COLORS.polaroid_white;

      // ── Renderer ──────────────────────────────────────────────────────────
      const w = container.clientWidth || 800;
      // Canvas must never be portrait — a taller-than-wide canvas stretches the
      // sphere into an oval. Cap height at container width to keep it circular.
      const h = Math.min(w, Math.round(window.innerHeight * 0.85));

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(new THREE.Color(tc.bgColor), 1);
      container.appendChild(renderer.domElement);

      // ── Scene & camera ─────────────────────────────────────────────────────
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.z = 2.6;

      // ── Lighting ───────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
      sun.position.set(4, 3, 4);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xe0eeff, 0.3);
      fill.position.set(-4, -2, -2);
      scene.add(fill);

      // ── Globe group ────────────────────────────────────────────────────────
      const globeGroup = new THREE.Group();
      scene.add(globeGroup);

      // Ocean sphere — polygonOffset pushes it back in the depth buffer so
      // land fills at radius 1.004+ never z-fight with the ocean surface.
      globeGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(1, 72, 72),
        new THREE.MeshPhongMaterial({
          color:         tc.oceanColor,
          shininess:     12,
          specular:      new THREE.Color(0x223344),
          polygonOffset:       true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits:  1,
        }),
      ));

      // Atmosphere glow
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.08, 32, 32),
        new THREE.MeshPhongMaterial({
          color:       tc.atmosphereColor,
          transparent: true,
          opacity:     0.04,
          side:        THREE.BackSide,
        }),
      ));

      if (cancelled) { renderer.dispose(); container.innerHTML = ''; return; }

      // ── World atlas ────────────────────────────────────────────────────────
      const [topoMod, worldData] = await Promise.all([
        import('topojson-client'),
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json()),
      ]);

      if (cancelled) { renderer.dispose(); container.innerHTML = ''; return; }

      const { feature } = topoMod;
      type WorldAtlas = { objects: { countries: Parameters<typeof feature>[1] } };
      const worldAtlas = worldData as unknown as WorldAtlas & Parameters<typeof feature>[0];
      const geojson = feature(worldAtlas, worldAtlas.objects.countries) as unknown as GeoJSON.FeatureCollection;

      // Numeric ISO-3166 → alpha-2 map
      const numToA2 = new Map<string, string>();
      try {
        const cc = await fetch('https://restcountries.com/v3.1/all?fields=cca2,ccn3');
        const ccData: Array<{ cca2: string; ccn3: string }> = await cc.json();
        for (const c of ccData) numToA2.set(c.ccn3, c.cca2);
      } catch { /* offline — country glow skipped */ }

      if (cancelled) { renderer.dispose(); container.innerHTML = ''; return; }

      // Visited codes from memory data
      const visitedCodes = new Set(
        memories
          .map(m => (m as unknown as Record<string, unknown>).country_code as string | undefined)
          .filter((c): c is string => Boolean(c)),
      );

      // Unvisited land material
      const landMat = new THREE.MeshPhongMaterial({
        color:     tc.landColor,
        shininess: 4,
        side:      THREE.DoubleSide,
      });

      // Visited pulsing shader material (one per mesh so uniforms are independent)
      const makeVisitedMat = () => new THREE.ShaderMaterial({
        uniforms: {
          baseColor: { value: new THREE.Color(tc.visitedColor) },
          glowColor: { value: new THREE.Color(tc.glowColor) },
          time:      { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal     = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3  baseColor;
          uniform vec3  glowColor;
          uniform float time;
          varying vec3  vNormal;
          void main() {
            float pulse = 0.5 + 0.5 * sin(time * 1.8);
            float rim   = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.4);
            vec3  col   = mix(baseColor, glowColor, rim * 0.6 + pulse * 0.25);
            gl_FragColor = vec4(col, 0.88 + rim * 0.12);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      });

      // Build meshes
      const visitedMeshes: Array<{ mesh: ThreeTypes.Mesh; code: string }> = [];
      let meshOk = 0, meshFail = 0;

      for (const feat of geojson.features) {
        const numeric  = String(feat.id ?? '').padStart(3, '0');
        const alpha2   = numToA2.get(numeric) ?? null;
        const isVisited = alpha2 ? visitedCodes.has(alpha2) : false;
        const mat      = isVisited ? makeVisitedMat() : landMat;
        const mesh     = buildCountryMesh(THREE, earcutFn, feat, isVisited ? 1.006 : 1.004, mat);
        if (!mesh) { meshFail++; continue; }
        meshOk++;
        globeGroup.add(mesh);
        if (isVisited && alpha2) visitedMeshes.push({ mesh, code: alpha2 });
      }

      // Country border lines — drawn above fill (radius 1.008)
      addCountryBorders(THREE, geojson, globeGroup, 1.008, tc.borderColor);

      if (cancelled) { renderer.dispose(); container.innerHTML = ''; return; }

      // ── Interaction state ──────────────────────────────────────────────────
      let autoRotate       = true;
      let autoRotateLocked = false; // true after a country click; released when sheet closes
      let isDragging = false;
      let lastX = 0, lastY = 0;
      let velX  = 0, velY  = 0;
      let targetRotY       = globeGroup.rotation.y;
      let targetRotX       = globeGroup.rotation.x;
      let isEasingToTarget = false; // only true after a country click

      const canvas = renderer.domElement;

      // Mouse
      canvas.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true; autoRotate = false;
        lastX = e.clientX; lastY = e.clientY;
        velX = velY = 0;
      });
      window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        velX = (e.clientX - lastX) * 0.007;
        velY = (e.clientY - lastY) * 0.007;
        globeGroup.rotation.y += velX;
        globeGroup.rotation.x  = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x + velY));
        lastX = e.clientX; lastY = e.clientY;
      });
      window.addEventListener('mouseup', () => { isDragging = false; });

      // Touch — rotate only, no pinch-zoom
      let lastTouchX = 0, lastTouchY = 0;
      canvas.addEventListener('touchstart', (e: TouchEvent) => {
        autoRotate = false;
        if (e.touches.length === 1) {
          isDragging = true;
          lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
          velX = velY = 0;
        }
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchmove', (e: TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
          velX = (e.touches[0].clientX - lastTouchX) * 0.007;
          velY = (e.touches[0].clientY - lastTouchY) * 0.007;
          globeGroup.rotation.y += velX;
          globeGroup.rotation.x  = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x + velY));
          lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
        }
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchend', () => { isDragging = false; });

      // Click: raycast → open sheet
      const raycaster    = new THREE.Raycaster();
      const mouse        = new THREE.Vector2();
      let   mouseDownPos = { x: 0, y: 0 };

      canvas.addEventListener('mousedown', (e: MouseEvent) => {
        mouseDownPos = { x: e.clientX, y: e.clientY };
      });
      canvas.addEventListener('click', (e: MouseEvent) => {
        if (Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y) > 4) return;
        const rect = canvas.getBoundingClientRect();
        mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(visitedMeshes.map(c => c.mesh), false);
        if (!hits.length) return;
        const entry = visitedMeshes.find(c => c.mesh === hits[0].object);
        if (!entry) return;

        // Ease globe to centre on clicked country
        const feat = geojson.features.find(f => {
          const numeric = String(f.id ?? '').padStart(3, '0');
          return numToA2.get(numeric) === entry.code;
        });
        if (feat) {
          let cLat = 0, cLng = 0, cnt = 0;
          const collect = (ring: GeoJSON.Position[]) => {
            for (const p of ring) { cLng += p[0]; cLat += p[1]; cnt++; }
          };
          const geom = feat.geometry;
          if (geom.type === 'Polygon')      collect(geom.coordinates[0]);
          if (geom.type === 'MultiPolygon') collect(geom.coordinates[0][0]);
          if (cnt > 0) {
            cLat /= cnt; cLng /= cnt;
            const [tx,, tz] = latLngToVec3(cLat, cLng, 1);
            // Desired absolute rotation to face this country toward the camera.
            // atan2(-tx, tz) gives the Y rotation at which z' = -tx*sin(θ)+tz*cos(θ)
            // is maximised (country centroid pointing toward +Z / camera).
            const desired = Math.atan2(-tx, tz);
            // Take the shortest angular path from the current rotation.
            let dY = desired - globeGroup.rotation.y;
            while (dY >  Math.PI) dY -= 2 * Math.PI;
            while (dY < -Math.PI) dY += 2 * Math.PI;
            targetRotY       = globeGroup.rotation.y + dY;
            targetRotX       = 0;
            isEasingToTarget = true;
            autoRotate       = false;
            autoRotateLocked = true; // keep auto-rotation off until sheet closes
          }
        }
        setTimeout(() => onClickCountry(entry.code), 700);
      });

      // Resize
      const onResize = () => {
        const nw = container.clientWidth;
        const nh = Math.min(nw, Math.round(window.innerHeight * 0.85));
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      // ── Animation loop ─────────────────────────────────────────────────────
      let t = 0;
      function animate() {
        if (cancelled) return;
        animId = requestAnimationFrame(animate);
        t += 0.016;

        // Pulse visited country shaders
        for (const { mesh } of visitedMeshes) {
          const mat = mesh.material as ThreeTypes.ShaderMaterial;
          if (mat.uniforms?.time) mat.uniforms.time.value = t;
        }

        if (isDragging) {
          // Keep targets in sync while dragging — prevents snap on release
          targetRotY = globeGroup.rotation.y;
          targetRotX = globeGroup.rotation.x;
          isEasingToTarget = false;
        } else if (isEasingToTarget) {
          // Ease toward the clicked country centre
          const dyY = targetRotY - globeGroup.rotation.y;
          const dyX = targetRotX - globeGroup.rotation.x;
          globeGroup.rotation.y += dyY * 0.06;
          globeGroup.rotation.x += dyX * 0.06;
          if (Math.abs(dyY) < 0.002 && Math.abs(dyX) < 0.002) {
            isEasingToTarget = false;
          }
        } else if (autoRotate) {
          globeGroup.rotation.y += 0.003;
          targetRotY = globeGroup.rotation.y;
        } else {
          // Inertia after drag release
          globeGroup.rotation.y += velX;
          globeGroup.rotation.x  = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x + velY));
          velX *= 0.92; velY *= 0.92;
          targetRotY = globeGroup.rotation.y;
          targetRotX = globeGroup.rotation.x;
          if (Math.abs(velX) < 0.0004 && Math.abs(velY) < 0.0004 && !autoRotateLocked) autoRotate = true;
        }

        renderer.render(scene, camera);
      }
      animate();

      // Cleanup on unmount
      const cleanup = () => {
        window.removeEventListener('mousemove', () => null);
        window.removeEventListener('mouseup',   () => null);
        window.removeEventListener('resize',    onResize);
        renderer.dispose();
      };
      (container as HTMLDivElement & { _globeCleanup?: () => void; _globeResumeRotation?: () => void })._globeCleanup = cleanup;
      // Expose auto-rotation resume so PhotoSheet onClose can call it
      (container as HTMLDivElement & { _globeResumeRotation?: () => void })._globeResumeRotation = () => {
        autoRotateLocked = false;
        autoRotate       = true;
      };
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      const cleanup = (container as HTMLDivElement & { _globeCleanup?: () => void })._globeCleanup;
      cleanup?.();
      while (container.firstChild) container.removeChild(container.firstChild);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationTheme]);

  return (
    <>
      <div
        ref={canvasRef}
        style={{ width: '100%', cursor: 'grab' }}
        onMouseDown={e => (e.currentTarget.style.cursor = 'grabbing')}
        onMouseUp={e =>   (e.currentTarget.style.cursor = 'grab')}
      />
      {sheet && (
        <PhotoSheet
          photos={sheet}
          onClose={() => {
            setSheet(null);
            // Resume auto-rotation now that the sheet is closed
            const el = canvasRef.current as (HTMLDivElement & { _globeResumeRotation?: () => void }) | null;
            el?._globeResumeRotation?.();
          }}
        />
      )}
    </>
  );
}
