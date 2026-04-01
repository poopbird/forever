'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useScroll } from 'framer-motion';
import type { Memory } from '@/types';
import type { InvitationTheme } from '@/lib/couple';
import { storageUrl } from '@/lib/storageUrl';

// ─── Card theme registry ──────────────────────────────────────────────────────
// All 4 themes share the same polaroid structure:
//   [frame border 10px top/sides] [photo 1:1 square] [footer with details]
// Dimensions: width min(400px, 85vw) · photo 1:1 · matches website POLAROID_W×H = 220×220
export interface CardThemeConfig {
  label:          string;
  description:    string;
  // Polaroid frame
  frameBg:        string;   // colour of the border areas (top/sides/footer wrapper)
  frameShadow:    string;
  footerBg:       string;   // footer background (may differ from frame for light themes)
  photoFallback:  string;   // CSS gradient when no photo is set
  // Name typography
  nameFont:       string;
  nameFontSize:   string;
  nameWeight:     number;
  nameStyle:      'normal' | 'italic';
  nameTracking?:  string;
  nameColor:      string;
  // Other text
  eyebrowColor:   string;
  labelColor:     string;
  valueColor:     string;
  ruleColor:      string;
  sepColor:       string;
  // Button
  btnColor:       string;
  btnBorder:      string;
  btnBg:          string;
  btnFont:        string;
  btnStyle?:      'normal' | 'italic';
  // Decorative effects
  hasGarden?:     boolean;  // botanical SVG overlay on photo
  hasStars?:      boolean;  // animated star field (midnight indigo)
  hasNoise?:      boolean;  // linen noise texture (sage linen)
}

export const CARD_THEMES: Record<InvitationTheme, CardThemeConfig> = {

  // ── The Curated Archive ────────────────────────────────────────────────────
  // Heirloom photo album: warm off-whites, Newsreader serif + Space Grotesk
  // typewriter labels, ink-on-paper contrast, sharp precise edges, ambient shadows
  polaroid_white: {
    label:         'The Curated Archive',
    description:   'Heirloom editorial — ink on fine paper',
    frameBg:       '#ffffff',
    frameShadow:   '0 20px 60px rgba(49,51,44,0.08), 0 6px 24px rgba(49,51,44,0.05)',
    footerBg:      '#fbf9f4',
    photoFallback: 'linear-gradient(145deg, #e8e5dc 0%, #d8d4c8 40%, #c8c3b4 70%, #b8b2a0 100%)',
    nameFont:      '"Newsreader", Georgia, serif',
    nameFontSize:  'clamp(2rem, 7vw, 2.8rem)',
    nameWeight:    400,
    nameStyle:     'italic',
    nameTracking:  '-0.01em',
    nameColor:     '#31332c',
    eyebrowColor:  '#5f5e5e',
    labelColor:    '#65655b',
    valueColor:    '#31332c',
    ruleColor:     'rgba(49,51,44,0.12)',
    sepColor:      'rgba(49,51,44,0.08)',
    btnColor:      '#faf7f6',
    btnBorder:     'none',
    btnBg:         '#5f5e5e',
    btnFont:       '"Space Grotesk", monospace',
  },

  // ── The Botanical Editorial ────────────────────────────────────────────────
  // Living invitation: warm cream surfaces, Noto Serif + Plus Jakarta Sans,
  // rose #7b5556 + sage #4f645b palette, soft organic depth, botanical overlays
  garden_bloom: {
    label:         'The Botanical Editorial',
    description:   'Pressed petals — warm, romantic, organic',
    frameBg:       '#ffffff',
    frameShadow:   '0 24px 72px rgba(123,85,86,0.12), 0 6px 24px rgba(79,100,91,0.07)',
    footerBg:      '#fbf9f5',
    photoFallback: 'linear-gradient(155deg, #e8d5d0 0%, #d4b8b2 30%, #c09a90 58%, #a87a6e 100%)',
    nameFont:      '"Noto Serif", Georgia, serif',
    nameFontSize:  'clamp(2rem, 7vw, 2.8rem)',
    nameWeight:    400,
    nameStyle:     'italic',
    nameTracking:  '0.01em',
    nameColor:     '#7b5556',
    eyebrowColor:  '#4f645b',
    labelColor:    'rgba(79,100,91,0.70)',
    valueColor:    'rgba(60,40,40,0.84)',
    ruleColor:     'rgba(123,85,86,0.14)',
    sepColor:      'rgba(79,100,91,0.12)',
    btnColor:      '#fffbf9',
    btnBorder:     'none',
    btnBg:         'linear-gradient(45deg, #7b5556, #b8827e)',
    btnFont:       '"Plus Jakarta Sans", sans-serif',
    hasGarden:     true,
  },

  // ── The Curated Atelier ────────────────────────────────────────────────────
  // High-end stationery: linen #fcffdc surfaces, Manrope geometric humanist,
  // sage #566252 primary, ultra-diffused ambient shadows, tonal layering only
  sage_linen: {
    label:         'The Curated Atelier',
    description:   'Earthy linen — composed, airy, minimalist',
    frameBg:       '#f6f4ea',
    frameShadow:   '0 20px 60px rgba(56,56,47,0.05), 0 4px 20px rgba(56,56,47,0.04)',
    footerBg:      '#fcffdc',
    photoFallback: 'linear-gradient(150deg, #dde5d0 0%, #c8d4be 30%, #b0c0a0 58%, #96a882 100%)',
    nameFont:      '"Manrope", sans-serif',
    nameFontSize:  'clamp(1.9rem, 6.5vw, 2.6rem)',
    nameWeight:    300,
    nameStyle:     'normal',
    nameTracking:  '-0.02em',
    nameColor:     '#566252',
    eyebrowColor:  '#6c6358',
    labelColor:    '#65655b',
    valueColor:    '#38382f',
    ruleColor:     'rgba(86,98,82,0.16)',
    sepColor:      'rgba(86,98,82,0.11)',
    btnColor:      '#effce7',
    btnBorder:     'none',
    btnBg:         'linear-gradient(45deg, #566252, #8fa888)',
    btnFont:       '"Manrope", sans-serif',
    hasNoise:      true,
  },

  // ── The Midnight Gala ─────────────────────────────────────────────────────
  // Digital gala: deep indigo #121318, gold #e9c176 + silver #bcc2ff,
  // Newsreader editorial serif + Manrope precision sans, star field, metallic CTA
  midnight_indigo: {
    label:         'The Midnight Gala',
    description:   'Gold & silver — exclusive, dramatic, celebratory',
    frameBg:       '#1b1c22',
    frameShadow:   '0 28px 80px rgba(0,0,0,0.65), 0 6px 28px rgba(20,34,131,0.22)',
    footerBg:      '#0d0e13',
    photoFallback: 'linear-gradient(145deg, #1b1c22 0%, #14152a 50%, #0d0e13 100%)',
    nameFont:      '"Newsreader", Georgia, serif',
    nameFontSize:  'clamp(1.9rem, 6.5vw, 2.7rem)',
    nameWeight:    400,
    nameStyle:     'italic',
    nameTracking:  '0.02em',
    nameColor:     '#e9c176',
    eyebrowColor:  '#bcc2ff',
    labelColor:    'rgba(188,194,255,0.65)',
    valueColor:    'rgba(233,193,118,0.88)',
    ruleColor:     'rgba(188,194,255,0.16)',
    sepColor:      'rgba(233,193,118,0.20)',
    btnColor:      '#1a1b22',
    btnBorder:     'none',
    btnBg:         'linear-gradient(135deg, #e9c176, #c9a94e)',
    btnFont:       '"Manrope", sans-serif',
    hasStars:      true,
  },
};

// ─── Google Font: Caveat (sharpie feel on memory polaroids) ──────────────────
const SHARPIE = '"Caveat", "Permanent Marker", cursive';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Convert HH:MM → h:mm AM/PM */
function fmt12h(hhmm: string): string {
  const [hStr, mStr = '00'] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
}
/** Format ISO date "YYYY-MM-DD" → "Sat, 19 Sep 2026" */
function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
/** Deterministic star positions for Midnight Indigo (avoids SSR hydration mismatch) */
const STAR_DATA = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37 + 13) % 100}%`,
  top:  `${(i * 53 + 7) % 100}%`,
  size: 1 + (i % 3) * 0.5,
  op:   0.45 + (i % 4) * 0.14,
  dur:  2 + (i % 5) * 0.6,
  del:  (i % 8) * 0.4,
}));

// ─── Polaroid layout constants ────────────────────────────────────────────────
const POLAROID_W    = 220;
const POLAROID_H    = 220;
const BORDER        = 12;
const BOTTOM_BORDER = 52;

// ─── 20 pre-computed pile positions ──────────────────────────────────────────
const PILE_SLOTS: Array<{
  x: string; y: string; rotate: number; z: number;
  fromX: string; fromY: string;
}> = [
  { x: '-30vw', y: '-18vh', rotate: -12, z: 1,  fromX: '-130vw', fromY:  '-50vh' },
  { x:  '24vw', y: '-24vh', rotate:  16, z: 2,  fromX:  '130vw', fromY:  '-70vh' },
  { x: '-10vw', y: '-10vh', rotate:  -7, z: 3,  fromX:    '0vw', fromY:  '130vh' },
  { x:  '36vw', y:   '6vh', rotate:  20, z: 4,  fromX:  '130vw', fromY:   '20vh' },
  { x: '-38vw', y:   '8vh', rotate: -18, z: 5,  fromX: '-130vw', fromY:   '25vh' },
  { x:  '14vw', y:  '16vh', rotate:   8, z: 6,  fromX:  '130vw', fromY:  '130vh' },
  { x: '-20vw', y:  '22vh', rotate: -10, z: 7,  fromX: '-130vw', fromY:  '130vh' },
  { x:  '30vw', y: '-12vh', rotate: -14, z: 8,  fromX:  '130vw', fromY:  '-30vh' },
  { x:  '-6vw', y:  '28vh', rotate:  12, z: 9,  fromX:    '0vw', fromY:  '130vh' },
  { x: '-26vw', y: '-14vh', rotate:   6, z: 10, fromX: '-130vw', fromY:  '-20vh' },
  { x:   '4vw', y: '-20vh', rotate:  11, z: 11, fromX:    '0vw', fromY: '-130vh' },
  { x:  '40vw', y: '-20vh', rotate: -23, z: 12, fromX:  '130vw', fromY:  '-80vh' },
  { x: '-42vw', y:  '-6vh', rotate:  17, z: 13, fromX: '-130vw', fromY:    '0vh' },
  { x:  '18vw', y:  '-2vh', rotate:  -4, z: 14, fromX:  '130vw', fromY: '-130vh' },
  { x: '-14vw', y:   '2vh', rotate:   3, z: 15, fromX: '-130vw', fromY: '-130vh' },
  { x:  '42vw', y:  '24vh', rotate: -19, z: 16, fromX:  '130vw', fromY:  '130vh' },
  { x: '-32vw', y:  '30vh', rotate:  15, z: 17, fromX: '-130vw', fromY:  '130vh' },
  { x:   '8vw', y:   '8vh', rotate:  -9, z: 18, fromX:  '130vw', fromY:    '0vh' },
  { x: '-22vw', y: '-30vh', rotate:  22, z: 19, fromX: '-130vw', fromY: '-130vh' },
  { x:  '28vw', y:  '34vh', rotate:  -6, z: 20, fromX:  '130vw', fromY:  '130vh' },
];

// ─── 20 fan-out positions — spread to all screen edges ───────────────────────
const FAN_SLOTS: Array<{ x: string; y: string; rotate: number }> = [
  { x: '-44vw', y: '-44vh', rotate: -32 },
  { x: '-20vw', y: '-50vh', rotate: -10 },
  { x:   '4vw', y: '-50vh', rotate:   8 },
  { x:  '28vw', y: '-46vh', rotate:  20 },
  { x:  '48vw', y: '-38vh', rotate:  30 },
  { x:  '52vw', y: '-10vh', rotate:  38 },
  { x:  '50vw', y:  '16vh', rotate: -32 },
  { x:  '46vw', y:  '40vh', rotate:  26 },
  { x:  '26vw', y:  '50vh', rotate:  18 },
  { x:   '6vw', y:  '52vh', rotate:  10 },
  { x: '-16vw', y:  '52vh', rotate:  -8 },
  { x: '-38vw', y:  '48vh', rotate: -20 },
  { x: '-52vw', y:  '30vh', rotate: -28 },
  { x: '-54vw', y:   '4vh', rotate:  24 },
  { x: '-50vw', y: '-22vh', rotate: -18 },
  { x: '-46vw', y: '-42vh', rotate:  14 },
  { x: '-10vw', y: '-46vh', rotate:  -6 },
  { x:  '16vw', y: '-50vh', rotate:  16 },
  { x:  '46vw', y:  '10vh', rotate: -14 },
  { x:  '44vw', y: '-18vh', rotate:  12 },
];

// ─── Scroll thresholds ────────────────────────────────────────────────────────
// 0.00 – 0.04 : section entry
// 0.04 – 0.64 : 20 polaroids fly in (3% each)
// 0.64 – 0.76 : hold — pile fully visible
// 0.76 – 0.92 : pile fans out to edges
// 0.92 – 1.00 : invitation text fully revealed
const ENTRY_START = 0.04;
const ENTRY_STEP  = 0.03;
const HOLD_END    = 0.76;
const FAN_END     = 0.92;

function polaroidEntryThreshold(i: number) {
  return ENTRY_START + i * ENTRY_STEP;
}

// ─── Single polaroid ──────────────────────────────────────────────────────────
function Polaroid({
  memory,
  slot,
  fanSlot,
  scrollProgress,
  entryThreshold,
}: {
  memory:         Memory;
  slot:           typeof PILE_SLOTS[0];
  fanSlot:        typeof FAN_SLOTS[0];
  scrollProgress: number;
  entryThreshold: number;
}) {
  const [imgError, setImgError] = useState(false);

  const inPile = scrollProgress >= entryThreshold;
  const inFan  = scrollProgress >= HOLD_END;

  const fanProgress = inFan
    ? Math.min((scrollProgress - HOLD_END) / (FAN_END - HOLD_END), 1)
    : 0;
  const easedFan = fanProgress < 0.5
    ? 4 * fanProgress ** 3
    : 1 - (-2 * fanProgress + 2) ** 3 / 2;

  if (!inPile) return null;

  return (
    <motion.div
      initial={{
        x:       slot.fromX,
        y:       slot.fromY,
        rotate:  slot.rotate + (Math.random() > 0.5 ? 15 : -15),
        opacity: 0,
        scale:   0.85,
      }}
      animate={{
        x:       inFan ? `calc(${slot.x} + (${fanSlot.x} - (${slot.x})) * ${easedFan})` : slot.x,
        y:       inFan ? `calc(${slot.y} + (${fanSlot.y} - (${slot.y})) * ${easedFan})` : slot.y,
        rotate:  inFan ? slot.rotate + (fanSlot.rotate - slot.rotate) * easedFan : slot.rotate,
        opacity: 1,
        scale:   1,
      }}
      transition={{
        type:      'spring',
        stiffness: 280,
        damping:   18,
        mass:      0.9,
        ...(inFan && {
          type:     'tween',
          duration: 0.6,
          ease:     [0.4, 0, 0.2, 1],
        }),
      }}
      style={{
        position:   'absolute',
        zIndex:     slot.z,
        left:       '50%',
        top:        '50%',
        marginLeft: -(POLAROID_W + BORDER * 2) / 2,
        marginTop:  -(POLAROID_H + BORDER + BOTTOM_BORDER) / 2,
        width:      POLAROID_W + BORDER * 2,
        filter:     'drop-shadow(0 8px 24px rgba(0,0,0,0.32))',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          background:   'white',
          padding:      `${BORDER}px ${BORDER}px ${BOTTOM_BORDER}px`,
          borderRadius: '3px',
          boxShadow:    '0 2px 8px rgba(0,0,0,0.14)',
        }}
      >
        <div
          style={{
            width:      POLAROID_W,
            height:     POLAROID_H,
            overflow:   'hidden',
            background: 'linear-gradient(135deg, #f5c6d0 0%, #e8a0b0 100%)',
          }}
        >
          {memory.media_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storageUrl(memory.media_url, { width: 400, quality: 75 })}
              alt={memory.caption}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #F5C6D0 0%, #FDEAEF 45%, #EEC0CC 100%)' }} />
          )}
        </div>

        <div style={{ height: BOTTOM_BORDER - 10, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
          <p style={{
            fontFamily:      SHARPIE,
            fontSize:        '1rem',
            color:           '#2a1a1a',
            textAlign:       'center',
            lineHeight:      1.2,
            overflow:        'hidden',
            display:         '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxWidth:        POLAROID_W - 8,
          }}>
            {memory.caption}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Inline editable text field ───────────────────────────────────────────────
function EditableField({
  value,
  placeholder,
  onSave,
  style,
  type = 'text',
  displayValue,
}: {
  value:         string;
  placeholder:   string;
  onSave:        (v: string) => void;
  style?:        React.CSSProperties;
  type?:         'text' | 'date' | 'time';
  displayValue?: string; // formatted display text (used for dates)
}) {
  const [editing, setEditing] = useState(false);
  const [local,   setLocal]   = useState(value);
  useEffect(() => setLocal(value), [value]);

  const baseStyle: React.CSSProperties = {
    background:  'transparent',
    border:      'none',
    outline:     'none',
    textAlign:   'center',
    width:       '100%',
    cursor:      'text',
    caretColor:  'rgba(201,150,74,0.8)',
    ...style,
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          ...baseStyle,
          borderBottom: local ? 'none' : '1px dashed rgba(201,150,74,0.4)',
          display:      'block',
          padding:      0,
        }}
      >
        {local
          ? <span style={style}>{displayValue ?? local}</span>
          : <span style={{ ...style, opacity: 0.38 }}>{placeholder}</span>
        }
      </button>
    );
  }

  return (
    <input
      type={type}
      autoFocus
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { setEditing(false); onSave(local); }}
      onKeyDown={e => {
        if (e.key === 'Enter')  (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setLocal(value); setEditing(false); }
      }}
      placeholder={placeholder}
      style={{ ...baseStyle, borderBottom: '1px dashed rgba(201,150,74,0.4)' }}
    />
  );
}

// ─── Invitation card — polaroid format (photo + themed footer) ───────────────
function FloatingInvitation({
  coupleName,
  visible,
  weddingDate,
  weddingTimeStart,
  weddingTimeEnd,
  weddingVenue,
  weddingCity,
  readOnly,
  onSaveDetails,
  rsvpEnabled,
  coupleId,
  cardTheme = 'polaroid_white',
  invitationPhotoUrl,
}: {
  coupleName:           string;
  visible:              boolean;
  weddingDate?:         string | null;
  weddingTimeStart?:    string | null;
  weddingTimeEnd?:      string | null;
  weddingVenue?:        string | null;
  weddingCity?:         string | null;
  readOnly?:            boolean;
  onSaveDetails?:       (fields: { wedding_date?: string; wedding_venue?: string; wedding_city?: string; wedding_time_start?: string; wedding_time_end?: string }) => Promise<void>;
  rsvpEnabled?:         boolean;
  coupleId?:            string;
  cardTheme?:           InvitationTheme;
  invitationPhotoUrl?:  string | null;
}) {
  const [saving,   setSaving]   = useState(false);
  const [imgError, setImgError] = useState(false);
  const t = CARD_THEMES[cardTheme] ?? CARD_THEMES.polaroid_white;

  // Per-theme ornament colour — used for the SVG flourish dividers
  const ornamentColor: string = (
    cardTheme === 'midnight_indigo' ? 'rgba(233,193,118,0.72)' :
    cardTheme === 'garden_bloom'    ? 'rgba(123,85,86,0.52)'   :
    cardTheme === 'sage_linen'      ? 'rgba(86,98,82,0.50)'    :
                                      'rgba(49,51,44,0.42)'
  );

  const hasDetails = weddingDate || weddingTimeStart || weddingVenue || weddingCity;

  async function handleSave(field: string, value: string) {
    if (!onSaveDetails) return;
    setSaving(true);
    try { await onSaveDetails({ [field]: value }); }
    finally { setSaving(false); }
  }

  // ── Centered inline detail row styles ───────────────────────────────────────
  // Each row: centred <p> with <span lbl>LABEL: </span><span val>value</span>
  const centeredRowStyle: React.CSSProperties = {
    textAlign:  'center',
    lineHeight: 1.4,
    margin:     0,
  };
  const newLblStyle: React.CSSProperties = {
    fontFamily:    t.btnFont,
    fontWeight:    300,
    fontSize:      '0.46rem',
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color:         t.labelColor,
  };
  const newValStyle: React.CSSProperties = {
    fontFamily:    t.btnFont,
    fontWeight:    400,
    fontSize:      '0.74rem',
    letterSpacing: '0.03em',
    color:         t.valueColor,
  };
  // (kept for EditableField width fallback)
  const sepStyle: React.CSSProperties = {
    width:      28,
    height:     1,
    background: t.sepColor,
    margin:     '2px auto',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
      animate={{
        opacity: visible ? 1 : 0,
        scale:   visible ? 1 : 0.92,
        x: '-50%',
        y: '-50%',
      }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position:      'absolute',
        left:          '50%',
        top:           '50%',
        zIndex:        30,
        pointerEvents: visible ? 'auto' : 'none',
        // min(400px, 85vw): spotlight on desktop, fills mobile beautifully
        width:         'min(400px, 85vw)',
      }}
    >
      {/* ── Polaroid frame shell ── */}
      <div style={{
        background:   t.frameBg,
        boxShadow:    t.frameShadow,
        borderRadius: '2px',
        // Polaroid border: equal on top/sides, footer handles bottom space
        padding:      '10px 10px 0',
        position:     'relative',
        overflow:     'hidden',
      }}>

        {/* Linen noise texture — Sage Linen only */}
        {t.hasNoise && (
          <div style={{
            position:        'absolute',
            inset:           0,
            zIndex:          3,
            pointerEvents:   'none',
            opacity:         0.16,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize:  '200px 200px',
          }} />
        )}

        {/* ── Photo section — 1:1 square, matches POLAROID_W × POLAROID_H = 220×220 ── */}
        <div style={{
          position:      'relative',
          width:         '100%',
          aspectRatio:   '1 / 1',
          overflow:      'hidden',
          background:    t.photoFallback,
          zIndex:        1,
        }}>
          {/* Midnight Indigo: nebula + star field (visible only when no real photo) */}
          {t.hasStars && (!invitationPhotoUrl || imgError) && (
            <>
              <div style={{
                position:   'absolute',
                inset:      0,
                background: 'radial-gradient(ellipse 60% 40% at 30% 60%, rgba(80,60,140,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 75% 25%, rgba(40,60,120,0.18) 0%, transparent 55%)',
              }} />
              {STAR_DATA.map((s, i) => (
                <div
                  key={i}
                  style={{
                    position:    'absolute',
                    left:        s.left,
                    top:         s.top,
                    width:       s.size,
                    height:      s.size,
                    borderRadius:'50%',
                    background:  '#fff',
                    animation:   `inv-twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
                    opacity:     s.op,
                  }}
                />
              ))}
            </>
          )}

          {/* Actual photo */}
          {invitationPhotoUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storageUrl(invitationPhotoUrl, { width: 800, quality: 85 })}
              alt="Invitation"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
              onError={() => setImgError(true)}
            />
          ) : null}

          {/* Garden Bloom: botanical SVG overlay (corner accent on top of photo) */}
          {t.hasGarden && (
            <svg
              style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.18, pointerEvents: 'none' }}
              width="110" height="110" viewBox="0 0 140 140" fill="none"
            >
              <path d="M10 130 C30 100, 50 80, 70 50" stroke="#1e3a1e" strokeWidth="1.5" fill="none"/>
              <path d="M40 95 C20 75, 10 55, 20 35" stroke="#1e3a1e" strokeWidth="1" fill="none"/>
              <path d="M60 70 C80 55, 100 50, 110 35" stroke="#1e3a1e" strokeWidth="1" fill="none"/>
              <ellipse cx="28" cy="108" rx="10" ry="5" fill="#2a5c2a" opacity="0.7" transform="rotate(-30 28 108)"/>
              <ellipse cx="52" cy="82" rx="12" ry="5" fill="#2a5c2a" opacity="0.6" transform="rotate(-50 52 82)"/>
              <ellipse cx="64" cy="60" rx="10" ry="4" fill="#2a5c2a" opacity="0.5" transform="rotate(-60 64 60)"/>
              <circle cx="70" cy="48" r="7" fill="#8c3040" opacity="0.5"/>
              <path d="M65 48 Q70 40 75 48 Q70 52 65 48" fill="#a83848" opacity="0.6"/>
              <path d="M70 43 Q76 48 70 53 Q64 48 70 43" fill="#c04058" opacity="0.5"/>
              <circle cx="20" cy="33" r="5" fill="#8c3040" opacity="0.4"/>
              <circle cx="110" cy="33" r="5" fill="#8c3040" opacity="0.35"/>
            </svg>
          )}
        </div>

        {/* ── Footer — couple name + wedding details ── */}
        <div style={{
          background:   t.footerBg,
          padding:      '14px 20px 18px',
          textAlign:    'center',
          position:     'relative',
          zIndex:       2,
        }}>
          {saving && (
            <p style={{ position: 'absolute', top: 6, right: 12, fontFamily: '"DM Sans", sans-serif', fontSize: '0.52rem', color: t.eyebrowColor }}>
              saving…
            </p>
          )}

          {/* Eyebrow */}
          <p style={{
            fontFamily:    '"DM Sans", sans-serif',
            fontWeight:    300,
            fontSize:      '0.52rem',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color:         t.eyebrowColor,
            marginBottom:  6,
          }}>
            ✦ You are invited ✦
          </p>

          {/* Couple name */}
          <div style={{
            fontFamily:    t.nameFont,
            fontSize:      t.nameFontSize,
            fontWeight:    t.nameWeight,
            fontStyle:     t.nameStyle,
            letterSpacing: t.nameTracking,
            color:         t.nameColor,
            lineHeight:    1.0,
            marginBottom:  10,
          }}>
            {coupleName}
          </div>

          {/* ── Top ornament divider ── */}
          <svg width="160" height="18" viewBox="0 0 160 18" fill="none"
            style={{ display: 'block', margin: '0 auto 10px' }}>
            <line x1="2" y1="9" x2="58" y2="9" stroke={ornamentColor} strokeWidth="0.5"/>
            <path d="M60 9 C63 4 67 4 70 9 C73 14 77 14 80 9" stroke={ornamentColor} strokeWidth="0.8" fill="none"/>
            <circle cx="80" cy="9" r="2" fill={ornamentColor}/>
            <path d="M80 9 C83 4 87 4 90 9 C93 14 97 14 100 9" stroke={ornamentColor} strokeWidth="0.8" fill="none"/>
            <line x1="102" y1="9" x2="158" y2="9" stroke={ornamentColor} strokeWidth="0.5"/>
          </svg>

          {/* Wedding details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {readOnly ? (
              <>
                {weddingDate && (
                  <p style={centeredRowStyle}>
                    <span style={newLblStyle}>Date&thinsp;&thinsp;</span>
                    <span style={newValStyle}>{fmtDate(weddingDate)}</span>
                  </p>
                )}
                {(weddingTimeStart || weddingTimeEnd) && (
                  <p style={centeredRowStyle}>
                    <span style={newLblStyle}>Time&thinsp;&thinsp;</span>
                    <span style={newValStyle}>
                      {weddingTimeStart ? fmt12h(weddingTimeStart.slice(0, 5)) : ''}
                      {weddingTimeEnd   ? ` – ${fmt12h(weddingTimeEnd.slice(0, 5))}` : ''}
                    </span>
                  </p>
                )}
                {(weddingVenue || weddingCity) && (
                  <p style={centeredRowStyle}>
                    <span style={newLblStyle}>Venue&thinsp;&thinsp;</span>
                    <span style={newValStyle}>
                      {weddingVenue ?? ''}{weddingCity ? `, ${weddingCity}` : ''}
                    </span>
                  </p>
                )}
                {!hasDetails && (
                  <p style={{ ...centeredRowStyle, ...newLblStyle, opacity: 0.4 }}>Details coming soon</p>
                )}
              </>
            ) : (
              <>
                {/* Date — editable */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ ...newLblStyle, display: 'block', marginBottom: 2 }}>Date</p>
                  <EditableField
                    type="date"
                    value={weddingDate ?? ''}
                    placeholder="Choose date"
                    displayValue={weddingDate ? fmtDate(weddingDate) : ''}
                    onSave={v => handleSave('wedding_date', v)}
                    style={newValStyle}
                  />
                </div>
                <div style={sepStyle} />
                {/* Time — editable */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ ...newLblStyle, display: 'block', marginBottom: 2 }}>Time</p>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                    <EditableField
                      type="time"
                      value={weddingTimeStart?.slice(0, 5) ?? ''}
                      placeholder="Start"
                      displayValue={weddingTimeStart ? fmt12h(weddingTimeStart.slice(0, 5)) : ''}
                      onSave={v => handleSave('wedding_time_start', v)}
                      style={{ ...newValStyle, minWidth: 60 }}
                    />
                    <span style={{ color: t.valueColor, opacity: 0.5 }}>–</span>
                    <EditableField
                      type="time"
                      value={weddingTimeEnd?.slice(0, 5) ?? ''}
                      placeholder="End"
                      displayValue={weddingTimeEnd ? fmt12h(weddingTimeEnd.slice(0, 5)) : ''}
                      onSave={v => handleSave('wedding_time_end', v)}
                      style={{ ...newValStyle, minWidth: 60 }}
                    />
                  </div>
                </div>
                <div style={sepStyle} />
                {/* Venue — editable */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ ...newLblStyle, display: 'block', marginBottom: 2 }}>Venue</p>
                  <EditableField
                    value={weddingVenue ?? ''}
                    placeholder="Venue name"
                    onSave={v => handleSave('wedding_venue', v)}
                    style={{ ...newValStyle, display: 'block' }}
                  />
                  <EditableField
                    value={weddingCity ?? ''}
                    placeholder="City"
                    onSave={v => handleSave('wedding_city', v)}
                    style={{ ...newValStyle, fontSize: '0.65rem', opacity: 0.7, display: 'block' }}
                  />
                </div>
                {!hasDetails && (
                  <p style={{ ...centeredRowStyle, ...newLblStyle, opacity: 0.4, marginTop: 4 }}>
                    ✎ Click any field to edit
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Bottom ornament divider ── */}
          <svg width="160" height="18" viewBox="0 0 160 18" fill="none"
            style={{ display: 'block', margin: '0 auto' }}>
            <line x1="2" y1="9" x2="58" y2="9" stroke={ornamentColor} strokeWidth="0.5"/>
            <path d="M60 9 C63 4 67 4 70 9 C73 14 77 14 80 9" stroke={ornamentColor} strokeWidth="0.8" fill="none"/>
            <circle cx="80" cy="9" r="2" fill={ornamentColor}/>
            <path d="M80 9 C83 4 87 4 90 9 C93 14 97 14 100 9" stroke={ornamentColor} strokeWidth="0.8" fill="none"/>
            <line x1="102" y1="9" x2="158" y2="9" stroke={ornamentColor} strokeWidth="0.5"/>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  highlights:           Memory[];
  allMemories:          Memory[];
  coupleName:           string;
  weddingDate?:         string | null;
  weddingTimeStart?:    string | null;
  weddingTimeEnd?:      string | null;
  weddingVenue?:        string | null;
  weddingCity?:         string | null;
  readOnly?:            boolean;
  coupleId?:            string;
  rsvpEnabled?:         boolean;
  invitationTheme?:     InvitationTheme | null;
  invitationPhotoUrl?:  string | null;  // selected photo; null = auto-pick most recent
}

export default function PolaroidHighlights({
  highlights,
  allMemories,
  coupleName,
  weddingDate:      weddingDateProp      = null,
  weddingTimeStart: weddingTimeStartProp = null,
  weddingTimeEnd:   weddingTimeEndProp   = null,
  weddingVenue:     weddingVenueProp     = null,
  weddingCity:      weddingCityProp      = null,
  readOnly = false,
  coupleId,
  rsvpEnabled = false,
  invitationTheme,
  invitationPhotoUrl = null,
}: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [localHighlights, setLocalHighlights] = useState<Memory[]>(highlights);
  const [scrollProg, setScrollProg]           = useState(0);

  const [weddingDate,      setWeddingDate]      = useState(weddingDateProp      ?? '');
  const [weddingTimeStart, setWeddingTimeStart] = useState(weddingTimeStartProp ?? '');
  const [weddingTimeEnd,   setWeddingTimeEnd]   = useState(weddingTimeEndProp   ?? '');
  const [weddingVenue,     setWeddingVenue]     = useState(weddingVenueProp     ?? '');
  const [weddingCity,      setWeddingCity]      = useState(weddingCityProp      ?? '');

  useEffect(() => { setLocalHighlights(highlights); }, [highlights]);
  useEffect(() => { setWeddingDate(weddingDateProp         ?? ''); }, [weddingDateProp]);
  useEffect(() => { setWeddingTimeStart(weddingTimeStartProp ?? ''); }, [weddingTimeStartProp]);
  useEffect(() => { setWeddingTimeEnd(weddingTimeEndProp     ?? ''); }, [weddingTimeEndProp]);
  useEffect(() => { setWeddingVenue(weddingVenueProp       ?? ''); }, [weddingVenueProp]);
  useEffect(() => { setWeddingCity(weddingCityProp         ?? ''); }, [weddingCityProp]);

  const { scrollYProgress } = useScroll({
    target:  sectionRef,
    offset:  ['start start', 'end end'],
  });

  useEffect(() => {
    return scrollYProgress.on('change', v => setScrollProg(v));
  }, [scrollYProgress]);

  const invitationVisible = scrollProg >= FAN_END;

  const photos = localHighlights.length > 0
    ? localHighlights
    : allMemories.filter(m => m.media_type === 'photo' && m.media_url).slice(0, 20);

  // Auto-pick the most recent memory photo when no photo is explicitly selected
  // allMemories is sorted ascending by date, so .at(-1) is the most recent
  const autoInvitationPhoto = useMemo(
    () => allMemories.filter(m => m.media_type === 'photo' && m.media_url).at(-1)?.media_url ?? null,
    [allMemories],
  );
  const resolvedInvitationPhoto = invitationPhotoUrl ?? autoInvitationPhoto;


  async function handleSaveDetails(fields: { wedding_date?: string; wedding_venue?: string; wedding_city?: string; wedding_time_start?: string; wedding_time_end?: string }) {
    if (fields.wedding_date       !== undefined) setWeddingDate(fields.wedding_date);
    if (fields.wedding_venue      !== undefined) setWeddingVenue(fields.wedding_venue);
    if (fields.wedding_city       !== undefined) setWeddingCity(fields.wedding_city);
    if (fields.wedding_time_start !== undefined) setWeddingTimeStart(fields.wedding_time_start);
    if (fields.wedding_time_end   !== undefined) setWeddingTimeEnd(fields.wedding_time_end);
    await fetch('/api/couples', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
  }

  if (photos.length === 0) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Manrope:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,300;1,6..72,400&family=Noto+Serif:ital,wght@0,400;1,400&family=Plus+Jakarta+Sans:wght@300;400;500&family=Space+Grotesk:wght@300;400;500&display=swap');
        @keyframes inv-twinkle {
          0%, 100% { opacity: var(--op, 0.6); transform: scale(1); }
          50%       { opacity: calc(var(--op, 0.6) * 0.2); transform: scale(0.55); }
        }
      `}</style>

      <section
        ref={sectionRef}
        id="highlights"
        style={{ height: '600vh', position: 'relative' }}
      >
        <div
          style={{
            position:   'sticky',
            top:        0,
            height:     '100vh',
            overflow:   'hidden',
            background: '#1a1210',
          }}
        >
          {/* Warm radial glow */}
          <div style={{
            position:      'absolute',
            inset:         0,
            background:    'radial-gradient(ellipse at 30% 50%, rgba(123,30,60,0.16) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(201,150,74,0.07) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />

          {/* Eyebrow — fades as polaroids arrive */}
          <motion.div
            animate={{ opacity: scrollProg > 0.10 ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            style={{
              position:      'absolute',
              top:           '50%',
              left:          '50%',
              transform:     'translate(-50%, -50%)',
              textAlign:     'center',
              zIndex:        30,
              pointerEvents: 'none',
              whiteSpace:    'nowrap',
            }}
          >
            <p style={{
              fontFamily:    '"Playfair Display", Georgia, serif',
              fontSize:      'clamp(1.4rem, 3vw, 2rem)',
              fontStyle:     'italic',
              color:         'rgba(253,248,240,0.85)',
              letterSpacing: '0.02em',
              marginBottom:  12,
            }}>
              A Glimpse of Our Story
            </p>
            <p style={{
              fontFamily:    '"Lato", sans-serif',
              fontSize:      '0.7rem',
              color:         'rgba(201,150,74,0.6)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}>
              scroll to explore ↓
            </p>
          </motion.div>

          {/* ── Polaroids ── */}
          {photos.map((memory, i) => (
            <Polaroid
              key={memory.id}
              memory={memory}
              slot={PILE_SLOTS[i % PILE_SLOTS.length]}
              fanSlot={FAN_SLOTS[i % FAN_SLOTS.length]}
              scrollProgress={scrollProg}
              entryThreshold={polaroidEntryThreshold(i)}
            />
          ))}

          {/* ── Floating invitation card ── */}
          <FloatingInvitation
            coupleName={coupleName}
            visible={invitationVisible}
            weddingDate={weddingDate || null}
            weddingTimeStart={weddingTimeStart || null}
            weddingTimeEnd={weddingTimeEnd || null}
            weddingVenue={weddingVenue || null}
            weddingCity={weddingCity || null}
            readOnly={readOnly}
            onSaveDetails={readOnly ? undefined : handleSaveDetails}
            rsvpEnabled={rsvpEnabled}
            coupleId={coupleId}
            cardTheme={invitationTheme ?? 'polaroid_white'}
            invitationPhotoUrl={resolvedInvitationPhoto}
          />

          {/* ── Progress dots ── */}
          {!invitationVisible && (
            <div style={{
              position:      'absolute',
              bottom:        28,
              left:          '50%',
              transform:     'translateX(-50%)',
              display:       'flex',
              gap:           5,
              zIndex:        40,
              pointerEvents: 'none',
            }}>
              {photos.map((_, i) => {
                const isLit = scrollProg >= polaroidEntryThreshold(i);
                return (
                  <div
                    key={i}
                    style={{
                      width:        isLit ? 16 : 5,
                      height:       5,
                      borderRadius: 3,
                      background:   isLit ? 'rgba(201,150,74,0.85)' : 'rgba(255,255,255,0.18)',
                      transition:   'all 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
          )}

        </div>
      </section>
    </>
  );
}
