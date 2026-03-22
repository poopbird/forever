'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactionBar from '@/components/guest/ReactionBar';
import CommentSection from '@/components/guest/CommentSection';
import type { Memory, CoupleAlbum, AlbumMemoryRow } from '@/types';
import { storageUrl } from '@/lib/storageUrl';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlbumConfig {
  id: string;
  label: string;
  date_start: string | null;
  date_end: string | null;
  cover_photo_url: string | null;
  sort_order: number;
}

interface AlbumWithMemories extends AlbumConfig {
  memories: Memory[];
  coverPhoto: string | null;
  palette: LeatherPalette;
  floatAnim: { duration: string; delay: string };
}

interface LeatherPalette {
  gradient: string;
  width: number;
  height: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PER_PAGE   = 4;
const PER_SPREAD = 8;

const LEATHER_PALETTES: LeatherPalette[] = [
  { gradient: 'linear-gradient(150deg,#5c2234 0%,#3a1320 60%,#2a0e18 100%)', width: 148, height: 192 },
  { gradient: 'linear-gradient(150deg,#1e3d2f 0%,#122818 60%,#0c1e12 100%)', width: 136, height: 212 },
  { gradient: 'linear-gradient(150deg,#1e2d4e 0%,#111c34 60%,#0a1226 100%)', width: 148, height: 192 },
  { gradient: 'linear-gradient(150deg,#4a3020 0%,#2e1c10 60%,#201208 100%)', width: 136, height: 200 },
  { gradient: 'linear-gradient(150deg,#3d2840 0%,#241530 60%,#180e22 100%)', width: 148, height: 192 },
];

const FLOAT_ANIMS = [
  { duration: '5.2s', delay: '0s' },
  { duration: '4.4s', delay: '-1.8s' },
  { duration: '5.8s', delay: '-3.5s' },
  { duration: '4.8s', delay: '-0.9s' },
  { duration: '5.5s', delay: '-2.3s' },
];

const POLAROID_ROTATIONS = [-6.5, 5.2, 7.8, -4.5];

// Tape colour per slot — subtle variation gives a hand-assembled feel
const TAPE_COLORS = [
  'rgba(238,228,195,0.80)',  // classic cream
  'rgba(220,232,220,0.76)',  // soft mint
  'rgba(232,220,232,0.76)',  // soft lavender
  'rgba(235,225,195,0.80)',  // warm straw
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAlbumsFromMemories(memories: Memory[]): Omit<AlbumConfig, never>[] {
  if (!memories.length) return [];
  const years = [
    ...new Set(memories.map(m => m.date?.slice(0, 4)).filter(Boolean)),
  ].sort() as string[];
  if (!years.length) return [];

  const makeAlbum = (group: string[], idx: number): AlbumConfig => {
    const start = group[0];
    const end   = group[group.length - 1];
    return {
      id: `auto-${start}-${end}`,
      label: start === end ? start : `${start} – ${end}`,
      date_start: `${start}-01-01`,
      date_end:   `${end}-12-31`,
      cover_photo_url: null,
      sort_order: idx,
    };
  };

  if (years.length <= 4) return years.map((y, i) => makeAlbum([y], i));

  const size = Math.ceil(years.length / 3);
  const groups: string[][] = [];
  for (let i = 0; i < years.length; i += size) groups.push(years.slice(i, i + size));
  return groups.map((g, i) => makeAlbum(g, i));
}

function filterMemoriesForAlbum(memories: Memory[], album: AlbumConfig): Memory[] {
  return memories
    .filter(m => {
      if (!m.date) return false;
      if (album.date_start && m.date < album.date_start) return false;
      if (album.date_end   && m.date > album.date_end)   return false;
      return true;
    })
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

function spreadSlice(memories: Memory[], spreadIdx: number) {
  const base = spreadIdx * PER_SPREAD;
  return {
    left:      memories.slice(base,          base + PER_PAGE),
    right:     memories.slice(base + PER_PAGE, base + PER_SPREAD),
    leftBase:  base,
    rightBase: base + PER_PAGE,
  };
}

function numSpreads(memories: Memory[]) {
  return Math.max(1, Math.ceil(memories.length / PER_SPREAD));
}

/** HTML string for the animated flipper faces (not interactive) */
function buildFlipperHTML(mems: Memory[], baseIdx: number): string {
  const slots = [...mems];
  while (slots.length < PER_PAGE) slots.push(null as unknown as Memory);
  return slots
    .map((m, i) => {
      const rot = POLAROID_ROTATIONS[i % 4];
      if (!m) {
        return `<div style="background:rgba(232,220,200,0.5);border:1.5px dashed rgba(180,160,130,0.6);border-radius:2px;"></div>`;
      }
      const tapeColor = TAPE_COLORS[i % 4];
      const tapeStyle = `position:absolute;width:36px;height:13px;background:${tapeColor};background-image:linear-gradient(90deg,rgba(255,255,255,0.22) 0%,transparent 50%,rgba(255,255,255,0.18) 100%);box-shadow:0 1px 3px rgba(0,0,0,0.14);border-radius:1px;z-index:6;pointer-events:none;`;
      const tapeTL = `<div style="${tapeStyle}top:-5px;left:6px;transform:rotate(-45deg);"></div>`;
      const tapeTR = `<div style="${tapeStyle}top:-5px;right:6px;transform:rotate(45deg);"></div>`;
      const img = m.media_url
        ? `<img src="${escapeHtml(storageUrl(m.media_url, { width: 400, quality: 75 }))}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />`
        : `<span style="font-size:22px">📷</span>`;
      const caption = m.caption
        ? `<div style="position:absolute;bottom:6px;left:7px;right:7px;text-align:center;font-family:'Dancing Script',cursive;font-size:11px;color:#5a3820;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(m.caption)}</div>`
        : '';
      return `<div style="background:#fff;padding:7px 7px 34px;box-shadow:0 3px 14px rgba(0,0,0,0.22);display:flex;flex-direction:column;position:relative;transform:rotate(${rot}deg);border-radius:1px;">
        ${tapeTL}${tapeTR}
        <div style="flex:1;background:#e8dece;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:0;">${img}</div>
        ${caption}
      </div>`;
    })
    .join('');
}

// ── Polaroid card (React, interactive) ───────────────────────────────────────

function PolaroidCard({
  memory,
  slotIndex,
  onOpen,
}: {
  memory: Memory | null;
  slotIndex: number;
  onOpen: () => void;
}) {
  const rot       = POLAROID_ROTATIONS[slotIndex % 4];
  const tapeColor = TAPE_COLORS[slotIndex % 4];

  if (!memory) {
    return (
      <div
        style={{
          background: 'rgba(232,220,200,0.5)',
          border: '1.5px dashed rgba(180,160,130,0.6)',
          borderRadius: 2,
        }}
      />
    );
  }

  // Tape strip style factory
  const tape = (top: number | 'auto', left: number | string | 'auto', right: number | string | 'auto', rotate: number) => ({
    position: 'absolute' as const,
    top:    top   === 'auto' ? 'auto' : top,
    left:   left  === 'auto' ? 'auto' : left,
    right:  right === 'auto' ? 'auto' : right,
    width: 36, height: 13,
    background: tapeColor,
    backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.22) 0%, transparent 50%, rgba(255,255,255,0.18) 100%)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.14)',
    transform: `rotate(${rotate}deg)`,
    zIndex: 6,
    pointerEvents: 'none' as const,
    borderRadius: 1,
  });

  return (
    <div
      onClick={onOpen}
      className="album-polaroid-card"
      style={{
        background: '#fff',
        padding: '7px 7px 34px',
        boxShadow: '0 3px 14px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transform: `rotate(${rot}deg)`,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s',
        borderRadius: 1,
        zIndex: 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = `rotate(${rot * 0.4}deg) scale(1.08) translateY(-6px)`;
        el.style.boxShadow = '0 18px 48px rgba(0,0,0,0.34), 0 4px 8px rgba(0,0,0,0.2)';
        el.style.zIndex    = '8';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = `rotate(${rot}deg)`;
        el.style.boxShadow = '0 3px 14px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12)';
        el.style.zIndex    = '1';
      }}
    >
      {/* Tape — top-left corner */}
      <div style={tape(-5, 6, 'auto', -45)} />
      {/* Tape — top-right corner */}
      <div style={tape(-5, 'auto', 6, 45)} />

      {/* Photo area */}
      <div
        style={{
          flex: 1,
          background: '#e8dece',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {memory.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={storageUrl(memory.media_url, { width: 400, quality: 75 })}
            alt={memory.caption || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: 22 }}>📷</span>
        )}
      </div>

      {/* Caption */}
      {memory.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 7,
            right: 7,
            textAlign: 'center',
            fontFamily: "'Dancing Script', cursive",
            fontSize: 11,
            color: '#5a3820',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {memory.caption}
        </div>
      )}
    </div>
  );
}

function PolaroidGrid({
  memories,
  baseIdx,
  onOpen,
}: {
  memories: Memory[];
  baseIdx: number;
  onOpen: (absoluteIdx: number) => void;
}) {
  const slots = [...memories];
  while (slots.length < PER_PAGE) slots.push(null as unknown as Memory);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 'clamp(14px, 3vw, 28px)',
        height: '100%',
        padding: 'clamp(8px, 1.5vw, 16px)',
      }}
    >
      {slots.map((m, i) => (
        <PolaroidCard
          key={m?.id ?? `empty-${baseIdx}-${i}`}
          memory={m ?? null}
          slotIndex={i}
          onOpen={() => m && onOpen(baseIdx + i)}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AlbumSectionProps {
  memories: Memory[];
  readOnly?: boolean;
  albumConfigs?: CoupleAlbum[];
  albumMemoryRows?: AlbumMemoryRow[];
  albumMode?: string;
}

export default function AlbumSection({ memories, readOnly, albumConfigs, albumMemoryRows, albumMode }: AlbumSectionProps) {
  // ── Build albums ────────────────────────────────────────────────────────────
  const albums = useMemo<AlbumWithMemories[]>(() => {
    let configs: Omit<AlbumConfig, never>[];

    if (albumConfigs && albumConfigs.length > 0) {
      // Use saved album configurations
      const isFreeform = albumMode === 'freeform';
      const memIdToAlbum: Record<string, string> = {};
      if (isFreeform && albumMemoryRows) {
        for (const row of albumMemoryRows) memIdToAlbum[row.memory_id] = row.album_id;
      }

      return albumConfigs
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cfg, i) => {
          let mems: Memory[];
          if (isFreeform) {
            mems = memories.filter(m => memIdToAlbum[m.id] === cfg.id);
          } else {
            mems = filterMemoriesForAlbum(memories, {
              ...cfg,
              id: cfg.id, label: cfg.label, cover_photo_url: cfg.cover_photo_url,
              sort_order: cfg.sort_order,
            });
          }
          // Hide empty freeform albums
          if (isFreeform && mems.length === 0) return null;

          const photoMems = mems.filter(m => m.media_url && m.media_type === 'photo');
          return {
            id:         cfg.id,
            label:      cfg.label,
            date_start: cfg.date_start,
            date_end:   cfg.date_end,
            cover_photo_url: cfg.cover_photo_url,
            sort_order: cfg.sort_order,
            memories:   mems,
            coverPhoto: cfg.cover_photo_url ?? photoMems[photoMems.length - 1]?.media_url ?? null,
            palette:    LEATHER_PALETTES[i % LEATHER_PALETTES.length],
            floatAnim:  FLOAT_ANIMS[i % FLOAT_ANIMS.length],
          } as AlbumWithMemories;
        })
        .filter((a): a is AlbumWithMemories => a !== null);
    }

    // Fallback: auto-generate from memories
    configs = buildAlbumsFromMemories(memories);
    return configs.map((cfg, i) => {
      const mems = filterMemoriesForAlbum(memories, cfg);
      const photoMems = mems.filter(m => m.media_url && m.media_type === 'photo');
      return {
        ...cfg,
        memories: mems,
        coverPhoto: photoMems[photoMems.length - 1]?.media_url ?? null,
        palette: LEATHER_PALETTES[i % LEATHER_PALETTES.length],
        floatAnim: FLOAT_ANIMS[i % FLOAT_ANIMS.length],
      };
    });
  }, [memories, albumConfigs, albumMemoryRows, albumMode]);

  // ── Mobile detection ────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Album open state ────────────────────────────────────────────────────────
  const [openIdx,        setOpenIdx]        = useState<number | null>(null);
  const [currentSpread,  setCurrentSpread]  = useState(0);
  const [focusedMemIdx,  setFocusedMemIdx]  = useState<number | null>(null);

  // ── Flip refs ───────────────────────────────────────────────────────────────
  const isFlippingRef  = useRef(false);
  const flipperRef     = useRef<HTMLDivElement>(null);
  const flipFrontRef   = useRef<HTMLDivElement>(null);
  const flipBackRef    = useRef<HTMLDivElement>(null);
  const leftGridRef    = useRef<HTMLDivElement>(null);
  const rightGridRef   = useRef<HTMLDivElement>(null);
  const spreadRef      = useRef(0);  // shadow of currentSpread for use inside doFlip
  useEffect(() => { spreadRef.current = currentSpread; }, [currentSpread]);

  const currentAlbum = openIdx !== null ? albums[openIdx] : null;

  const openAlbum = (idx: number) => { setOpenIdx(idx); setCurrentSpread(0); };
  const closeAlbum = () => { setOpenIdx(null); setFocusedMemIdx(null); };

  // ── Page flip ───────────────────────────────────────────────────────────────
  const doFlip = useCallback(
    (target: number, dir: number) => {
      if (isFlippingRef.current || !currentAlbum) return;
      const total = numSpreads(currentAlbum.memories);
      if (target < 0 || target >= total) return;

      isFlippingRef.current = true;
      const flipper   = flipperRef.current!;
      const flipFront = flipFrontRef.current!;
      const flipBack  = flipBackRef.current!;
      const leftGrid  = leftGridRef.current!;
      const rightGrid = rightGridRef.current!;

      const cur  = spreadSlice(currentAlbum.memories, spreadRef.current);
      const next = spreadSlice(currentAlbum.memories, target);

      if (dir > 0) {
        Object.assign(flipper.style, { left: '50%', right: '0', transformOrigin: 'left center' });
        flipFront.innerHTML = buildFlipperHTML(cur.right,  cur.rightBase);
        flipBack.innerHTML  = buildFlipperHTML(next.left,  next.leftBase);
        rightGrid.style.visibility = 'hidden';
      } else {
        Object.assign(flipper.style, { left: '0', right: '50%', transformOrigin: 'right center' });
        flipFront.innerHTML = buildFlipperHTML(cur.left,   cur.leftBase);
        flipBack.innerHTML  = buildFlipperHTML(next.right, next.rightBase);
        leftGrid.style.visibility = 'hidden';
      }

      flipper.style.display    = 'block';
      flipper.style.transform  = 'rotateY(0deg)';
      flipper.style.transition = 'none';
      void flipper.offsetWidth; // force reflow before adding transition
      flipper.style.transition = 'transform 0.68s cubic-bezier(0.645,0.045,0.355,1)';
      flipper.style.transform  = dir > 0 ? 'rotateY(-180deg)' : 'rotateY(180deg)';

      setTimeout(() => {
        setCurrentSpread(target);
        leftGrid.style.visibility  = '';
        rightGrid.style.visibility = '';
        flipper.style.transition   = 'none';
        flipper.style.display      = 'none';
        isFlippingRef.current = false;
      }, 720);
    },
    [currentAlbum],
  );

  const flipPage   = (dir: number) => { if (currentAlbum) doFlip(currentSpread + dir, dir); };
  const jumpSpread = (idx: number) => { if (!isFlippingRef.current && idx !== currentSpread) doFlip(idx, idx > currentSpread ? 1 : -1); };

  // ── Focused view ────────────────────────────────────────────────────────────
  const [focusedKey, setFocusedKey] = useState(0); // increment to re-trigger animation

  const openFocused = (idx: number) => {
    setFocusedMemIdx(idx);
    setFocusedKey(k => k + 1);
  };

  const navigateFocused = (dir: number) => {
    if (!currentAlbum || focusedMemIdx === null) return;
    const total = currentAlbum.memories.length;
    const next  = (focusedMemIdx + dir + total) % total;
    openFocused(next);
  };

  const focusedMemory = currentAlbum && focusedMemIdx !== null
    ? currentAlbum.memories[focusedMemIdx]
    : null;

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (focusedMemIdx !== null) {
        if (e.key === 'ArrowLeft')  navigateFocused(-1);
        if (e.key === 'ArrowRight') navigateFocused(1);
        if (e.key === 'Escape')     setFocusedMemIdx(null);
      } else if (openIdx !== null) {
        if (e.key === 'ArrowLeft')  flipPage(-1);
        if (e.key === 'ArrowRight') flipPage(1);
        if (e.key === 'Escape')     closeAlbum();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdx, focusedMemIdx, currentSpread, currentAlbum]);

  // ── Spread data ─────────────────────────────────────────────────────────────
  const total  = currentAlbum ? numSpreads(currentAlbum.memories) : 1;
  const spread = currentAlbum ? spreadSlice(currentAlbum.memories, currentSpread) : null;

  const formattedDate = focusedMemory?.date
    ? (() => {
        try {
          return new Date(focusedMemory.date + 'T00:00:00').toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          });
        } catch {
          return focusedMemory.date;
        }
      })()
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Keyframe animations ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes albumFloat {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%      { transform: translateY(-12px) rotate(0.3deg); }
          66%      { transform: translateY(-6px) rotate(-0.2deg); }
        }
        @keyframes albumOpen {
          from { opacity:0; transform: perspective(2000px) rotateY(-35deg) rotateX(4deg) scale(0.78) translateX(-60px); }
          to   { opacity:1; transform: perspective(2000px) rotateY(0deg)   rotateX(0deg) scale(1)    translateX(0); }
        }
        @keyframes polaroidPop {
          from { opacity:0; transform: scale(0.78) rotate(-4deg) translateY(12px); }
          to   { opacity:1; transform: scale(1)    rotate(0deg)  translateY(0); }
        }
        .album-book:hover .album-book-cover {
          box-shadow: -5px 5px 0 #1a0e04, 6px 14px 40px rgba(0,0,0,0.7), 0 0 30px rgba(201,150,74,0.2) !important;
        }
        .album-book:hover { filter: brightness(1.12); animation-play-state: paused !important; }
        /* Flipper face styles */
        .flipper-face {
          position:absolute; inset:0;
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
          display:grid;
          grid-template-columns:1fr 1fr;
          grid-template-rows:1fr 1fr;
          gap:clamp(14px, 3vw, 28px);
          padding:clamp(12px, 2vw, 24px);
          overflow:visible;
        }
        .flipper-face-back {
          transform: rotateY(180deg);
        }
        /* Mobile: stack pages vertically */
        @media (max-width: 679px) {
          .album-spread {
            flex-direction: column !important;
          }
          .album-page-left, .album-page-right {
            flex: none !important;
            height: 50% !important;
            border-right: none !important;
            border-bottom: 2px solid #d0c4a8;
          }
          .album-page-right {
            border-bottom: none !important;
          }
        }
      `}</style>

      {/* ── Section ─────────────────────────────────────────────────────────── */}
      <section
        id="albums"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px 80px',
          background: 'linear-gradient(to bottom, #13100c, #1c160e)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient warm glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 700, height: 400,
            background: 'radial-gradient(ellipse, rgba(201,150,74,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Section label */}
        <div
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#c9964a',
            marginBottom: 12,
          }}
        >
          Our Story
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(26px, 4.5vw, 48px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#f5f0e8',
            marginBottom: 8,
            textAlign: 'center',
            lineHeight: 1.15,
          }}
        >
          A lifetime of moments
        </h2>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: 14,
            fontWeight: 300,
            color: '#7a6040',
            marginBottom: 64,
            letterSpacing: '0.04em',
          }}
        >
          Open an album to relive the journey
        </p>

        {/* Shelf */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 44,
            flexWrap: 'wrap',
            padding: '48px 20px 0',
            maxWidth: 900,
            width: '100%',
          }}
        >
          {albums.length === 0 ? (
            <p style={{ color: '#7a6040', fontFamily: "'Lato', sans-serif", fontSize: 14 }}>
              No memories yet — add your first memory to get started.
            </p>
          ) : (
            albums.map((album, i) => (
              <div
                key={album.id}
                className="album-book"
                onClick={() => openAlbum(i)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: `albumFloat ${album.floatAnim.duration} ${album.floatAnim.delay} linear infinite`,
                  willChange: 'transform',
                  marginBottom: album.palette.height === 212 ? 12 : 0,
                }}
              >
                {/* Book cover */}
                <div
                  className="album-book-cover"
                  style={{
                    width: album.palette.width,
                    height: album.palette.height,
                    background: album.palette.gradient,
                    borderRadius: '3px 12px 12px 3px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '-5px 5px 0 #1a0e04, 4px 10px 32px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '18px 14px',
                    transition: 'box-shadow 0.3s',
                  }}
                >
                  {/* Spine shadow */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: 12, height: '100%',
                    background: 'linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.1), transparent)',
                    zIndex: 4, pointerEvents: 'none',
                  }} />
                  {/* Right edge highlight */}
                  <div style={{
                    position: 'absolute', top: 0, right: 0, width: 3, height: '100%',
                    background: 'linear-gradient(to left, rgba(255,255,255,0.12), transparent)',
                    zIndex: 4, pointerEvents: 'none',
                  }} />
                  {/* Leather sheen */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(ellipse 80% 50% at 30% 40%, rgba(255,255,255,0.05), transparent), radial-gradient(ellipse 60% 80% at 70% 60%, rgba(0,0,0,0.2), transparent)',
                    zIndex: 1, pointerEvents: 'none',
                  }} />
                  {/* Small affixed cover photo */}
                  <div
                    style={{
                      position: 'relative', zIndex: 3,
                      width: 70, height: 70,
                      boxShadow: '0 0 0 3px rgba(255,255,255,0.9), 0 0 0 4px rgba(0,0,0,0.15), 0 3px 12px rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0,
                      background: 'rgba(0,0,0,0.25)',
                    }}
                  >
                    {album.coverPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={storageUrl(album.coverPhoto, { width: 200, quality: 75 })}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 26 }}>📷</span>
                    )}
                  </div>
                  {/* Year label */}
                  <div
                    style={{
                      position: 'relative', zIndex: 3,
                      fontFamily: "'Dancing Script', cursive",
                      fontSize: 15, color: 'rgba(255,255,255,0.82)',
                      textAlign: 'center', lineHeight: 1.5,
                      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {album.label.replace(' – ', '\n–\n').split('\n').map((line, l) => (
                      <span key={l} style={{ display: 'block' }}>{line}</span>
                    ))}
                  </div>
                </div>
                <span
                  style={{
                    marginTop: 10,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 10, fontWeight: 300,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'rgba(201,150,74,0.45)',
                  }}
                >
                  click to open
                </span>
              </div>
            ))
          )}
        </div>

        {/* Wooden shelf plank */}
        <div
          style={{
            width: '100%', maxWidth: 560, height: 18,
            background: 'linear-gradient(to bottom, #6b4a28 0%, #4a2e14 40%, #3a2010 100%)',
            borderRadius: 3,
            boxShadow: '0 6px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />
      </section>

      {/* ── Album overlay ────────────────────────────────────────────────────── */}
      {openIdx !== null && currentAlbum && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeAlbum(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(6,4,2,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? 0 : 'clamp(8px, 2vh, 28px)',
          }}
        >
          <div
            key={openIdx}
            style={{
              width: '100%',
              maxWidth: isMobile ? '100vw' : 'min(96vw, 1320px)',
              height: isMobile ? '100dvh' : 'min(94vh, 920px)',
              display: 'flex', flexDirection: 'column',
              borderRadius: isMobile ? 0 : '3px 10px 10px 3px',
              overflow: 'hidden',
              boxShadow: isMobile ? 'none' : '0 60px 140px rgba(0,0,0,0.9), 0 20px 60px rgba(0,0,0,0.7)',
              animation: 'albumOpen 0.65s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            {/* Header */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                background: 'linear-gradient(to right, #d8cdb0, #e8dfc8)',
                borderBottom: '1px solid #c8bda0',
                position: 'relative',
              }}
            >
              {/* Binding strip */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 16,
                background: 'linear-gradient(to right, #3a2510, #5a3a1a)',
                borderRight: '1px solid rgba(255,255,255,0.1)',
              }} />
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 16, fontStyle: 'italic',
                color: '#2a1a08', letterSpacing: '0.04em',
                paddingLeft: 24,
              }}>
                {currentAlbum.label}
              </div>
              <button
                onClick={closeAlbum}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: '1px solid rgba(90,58,26,0.25)',
                  background: 'rgba(90,58,26,0.1)',
                  color: '#2a1a08', fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Two-page spread */}
            <div
              className="album-spread"
              style={{
                flex: 1, display: 'flex', minHeight: 0,
                perspective: '2400px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left page */}
              <div
                className="album-page-left"
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  background: 'linear-gradient(108deg, #f2ead8 0%, #ece2ca 100%)',
                  borderRight: '2px solid #d0c4a8',
                  position: 'relative', overflow: 'visible',
                }}
              >
                {/* Spine curl shadow */}
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
                  background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.07))',
                  pointerEvents: 'none', zIndex: 2,
                }} />
                <div ref={leftGridRef} style={{ flex: 1, minHeight: 0 }}>
                  {spread && (
                    <PolaroidGrid
                      memories={spread.left}
                      baseIdx={spread.leftBase}
                      onOpen={openFocused}
                    />
                  )}
                </div>
              </div>

              {/* Right page */}
              <div
                className="album-page-right"
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  background: 'linear-gradient(252deg, #f0e8d4 0%, #eadfc8 100%)',
                  position: 'relative', overflow: 'visible',
                }}
              >
                {/* Spine curl shadow */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: 32,
                  background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.07))',
                  pointerEvents: 'none', zIndex: 2,
                }} />
                <div ref={rightGridRef} style={{ flex: 1, minHeight: 0 }}>
                  {spread && (
                    <PolaroidGrid
                      memories={spread.right}
                      baseIdx={spread.rightBase}
                      onOpen={openFocused}
                    />
                  )}
                </div>
              </div>

              {/* 3D flipper — imperative, hidden until doFlip runs */}
              <div
                ref={flipperRef}
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: 0, bottom: 0,
                  transformStyle: 'preserve-3d',
                  zIndex: 10,
                }}
              >
                <div
                  ref={flipFrontRef}
                  className="flipper-face"
                  style={{ background: 'linear-gradient(108deg, #f2ead8 0%, #ece2ca 100%)' }}
                />
                <div
                  ref={flipBackRef}
                  className="flipper-face flipper-face-back"
                  style={{ background: 'linear-gradient(252deg, #f0e8d4 0%, #eadfc8 100%)' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px',
                background: 'linear-gradient(to right, #d8cdb0, #e0d4b8)',
                borderTop: '1px solid #c8bda0',
                position: 'relative',
              }}
            >
              {/* Binding strip */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 16,
                background: 'linear-gradient(to right, #3a2510, #5a3a1a)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }} />
              <button
                onClick={() => flipPage(-1)}
                disabled={currentSpread === 0}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: '1px solid rgba(90,58,26,0.3)',
                  background: 'rgba(90,58,26,0.1)',
                  color: '#2a1a08', fontSize: 20,
                  cursor: currentSpread === 0 ? 'default' : 'pointer',
                  opacity: currentSpread === 0 ? 0.28 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                  lineHeight: 1,
                }}
              >
                ‹
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16 }}>
                {Array.from({ length: total }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => jumpSpread(i)}
                    style={{
                      width: i === currentSpread ? 10 : 7,
                      height: i === currentSpread ? 10 : 7,
                      borderRadius: '50%',
                      border: 'none',
                      background: i === currentSpread ? '#c9964a' : 'rgba(90,58,26,0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      padding: 0,
                    }}
                  />
                ))}
                <span
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 11, fontWeight: 300,
                    color: '#7a6040', letterSpacing: '0.12em',
                    marginLeft: 4,
                  }}
                >
                  {currentSpread + 1} / {total}
                </span>
              </div>

              <button
                onClick={() => flipPage(1)}
                disabled={currentSpread >= total - 1}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: '1px solid rgba(90,58,26,0.3)',
                  background: 'rgba(90,58,26,0.1)',
                  color: '#2a1a08', fontSize: 20,
                  cursor: currentSpread >= total - 1 ? 'default' : 'pointer',
                  opacity: currentSpread >= total - 1 ? 0.28 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                  lineHeight: 1,
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Focused polaroid overlay ─────────────────────────────────────────── */}
      {focusedMemory && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setFocusedMemIdx(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,3,1,0.82)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '90vw' }}>

            {/* Close hint */}
            <div
              onClick={() => setFocusedMemIdx(null)}
              style={{
                position: 'absolute', top: -32, right: 0,
                fontFamily: "'Lato', sans-serif",
                fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)', cursor: 'pointer',
              }}
            >
              click outside to close
            </div>

            {/* Side nav — prev */}
            <button
              onClick={() => navigateFocused(-1)}
              style={{
                position: 'absolute', right: 'calc(100% + 14px)',
                top: '40%', transform: 'translateY(-50%)',
                width: 38, height: 38, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 20,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                lineHeight: 1, zIndex: 5,
              }}
            >
              ‹
            </button>
            {/* Side nav — next */}
            <button
              onClick={() => navigateFocused(1)}
              style={{
                position: 'absolute', left: 'calc(100% + 14px)',
                top: '40%', transform: 'translateY(-50%)',
                width: 38, height: 38, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 20,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                lineHeight: 1, zIndex: 5,
              }}
            >
              ›
            </button>

            {/* The polaroid */}
            <div
              key={focusedKey}
              style={{
                background: '#fff',
                padding: '10px 10px 64px',
                width: 'min(320px, 82vw)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
                animation: 'polaroidPop 0.32s cubic-bezier(0.22,1,0.36,1) both',
                position: 'relative',
              }}
            >
              {/* Photo */}
              <div
                style={{
                  width: '100%', aspectRatio: '1',
                  background: '#e0d4c0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {focusedMemory.media_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storageUrl(focusedMemory.media_url, { width: 800, quality: 80 })}
                    alt={focusedMemory.caption || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span style={{ fontSize: 64 }}>📷</span>
                )}
              </div>

              {/* Caption strip */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0, left: 10, right: 10, height: 60,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3,
                  padding: '4px 0',
                }}
              >
                {focusedMemory.caption && (
                  <div style={{
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: 17, color: '#2a1a08',
                    textAlign: 'center', lineHeight: 1.2,
                  }}>
                    {focusedMemory.caption}
                  </div>
                )}
                <div style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: 10, fontWeight: 300,
                  letterSpacing: '0.1em', color: '#7a6040',
                  textAlign: 'center',
                }}>
                  {[formattedDate, focusedMemory.location_name].filter(Boolean).join('  ·  ')}
                </div>
              </div>
            </div>

            {/* Reactions + comments (cream card, matches site theme) */}
            {!readOnly && (
              <div
                style={{
                  width: 'min(320px, 82vw)',
                  marginTop: 12,
                  background: '#f5f0e8',
                  borderRadius: 12,
                  padding: '12px 16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                <ReactionBar  memoryId={focusedMemory.id} />
                <CommentSection memoryId={focusedMemory.id} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
