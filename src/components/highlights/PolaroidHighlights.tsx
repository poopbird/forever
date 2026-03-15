'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import type { Memory } from '@/types';
import PolaroidPicker from './PolaroidPicker';

// ─── Google Font: Caveat (sharpie feel) ──────────────────────────────────────
const SHARPIE = '"Caveat", "Permanent Marker", cursive';

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
              src={memory.media_url}
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
}: {
  value:       string;
  placeholder: string;
  onSave:      (v: string) => void;
  style?:      React.CSSProperties;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onSave(local)}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      style={{
        background:        'transparent',
        border:            'none',
        borderBottom:      local ? 'none' : '1px dashed rgba(201,150,74,0.4)',
        outline:           'none',
        textAlign:         'center',
        width:             '100%',
        cursor:            'text',
        caretColor:        'rgba(201,150,74,0.8)',
        ...style,
      }}
    />
  );
}

// ─── Floating invitation text — no box, no border, pure type ─────────────────
function FloatingInvitation({
  coupleName,
  visible,
  weddingDate,
  weddingVenue,
  weddingCity,
  readOnly,
  onSaveDetails,
}: {
  coupleName:     string;
  visible:        boolean;
  weddingDate?:   string | null;
  weddingVenue?:  string | null;
  weddingCity?:   string | null;
  readOnly?:      boolean;
  onSaveDetails?: (fields: { wedding_date?: string; wedding_venue?: string; wedding_city?: string }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSave(field: string, value: string) {
    if (!onSaveDetails) return;
    setSaving(true);
    try { await onSaveDetails({ [field]: value }); }
    finally { setSaving(false); }
  }

  const hasDetails = weddingDate || weddingVenue || weddingCity;

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
        textAlign:     'center',
        pointerEvents: visible ? 'auto' : 'none',
        width:         'min(640px, 80vw)',
      }}
    >
      {/* Saving indicator */}
      {saving && (
        <p style={{ position: 'absolute', top: -24, right: 0, fontFamily: '"Lato", sans-serif', fontSize: '0.58rem', color: 'rgba(201,150,74,0.45)', letterSpacing: '0.1em' }}>
          saving…
        </p>
      )}

      {/* Eyebrow */}
      <p style={{
        fontFamily:    '"Lato", sans-serif',
        fontSize:      '0.62rem',
        letterSpacing: '0.45em',
        textTransform: 'uppercase',
        color:         'rgba(201,150,74,0.65)',
        marginBottom:  20,
      }}>
        ✦ &nbsp; You are invited &nbsp; ✦
      </p>

      {/* Couple name */}
      <h2 style={{
        fontFamily:    '"Playfair Display", Georgia, serif',
        fontSize:      'clamp(3rem, 7vw, 5.5rem)',
        fontStyle:     'italic',
        fontWeight:    700,
        color:         'rgba(255,243,225,0.97)',
        lineHeight:    1.05,
        marginBottom:  20,
        letterSpacing: '-0.01em',
        textShadow:    '0 0 60px rgba(201,150,74,0.22)',
      }}>
        {coupleName}
      </h2>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 22 }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,150,74,0.45))' }} />
        <span style={{ color: 'rgba(201,150,74,0.55)', fontSize: '0.58rem', letterSpacing: '0.25em' }}>◆ ◆ ◆</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,150,74,0.45))' }} />
      </div>

      {/* Tagline */}
      <p style={{
        fontFamily:    '"Lato", sans-serif',
        fontSize:      'clamp(0.88rem, 2vw, 1.05rem)',
        color:         'rgba(240,220,200,0.55)',
        lineHeight:    1.85,
        letterSpacing: '0.04em',
        marginBottom:  28,
      }}>
        Join us as we celebrate our love<br />
        and begin our forever together.
      </p>

      {/* Wedding details — floating type, no box */}
      <div>
        <p style={{
          fontFamily:    '"Playfair Display", serif',
          fontSize:      '0.72rem',
          fontStyle:     'italic',
          color:         'rgba(201,150,74,0.55)',
          marginBottom:  12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          — Our Wedding Day —
        </p>

        {readOnly ? (
          <div style={{ fontFamily: '"Lato", sans-serif', fontSize: 'clamp(1rem, 2.4vw, 1.2rem)', color: 'rgba(240,220,200,0.72)', lineHeight: 2 }}>
            {hasDetails ? (
              <>
                {weddingDate  && <p>{weddingDate}</p>}
                {weddingVenue && <p>{weddingVenue}</p>}
                {weddingCity  && <p>{weddingCity}</p>}
              </>
            ) : (
              <p style={{ opacity: 0.28, fontSize: '0.82rem' }}>Details coming soon</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <EditableField
              value={weddingDate ?? ''}
              placeholder="Date  (e.g. Saturday, 14 June 2025)"
              onSave={v => handleSave('wedding_date', v)}
              style={{ fontFamily: '"Lato", sans-serif', fontSize: 'clamp(1rem, 2.4vw, 1.2rem)', color: 'rgba(240,220,200,0.82)', lineHeight: 2 }}
            />
            <EditableField
              value={weddingVenue ?? ''}
              placeholder="Venue name"
              onSave={v => handleSave('wedding_venue', v)}
              style={{ fontFamily: '"Lato", sans-serif', fontSize: 'clamp(1rem, 2.4vw, 1.2rem)', color: 'rgba(240,220,200,0.82)', lineHeight: 2 }}
            />
            <EditableField
              value={weddingCity ?? ''}
              placeholder="City / Location"
              onSave={v => handleSave('wedding_city', v)}
              style={{ fontFamily: '"Lato", sans-serif', fontSize: 'clamp(1rem, 2.4vw, 1.2rem)', color: 'rgba(240,220,200,0.82)', lineHeight: 2 }}
            />
            {!hasDetails && (
              <p style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.6rem', color: 'rgba(201,150,74,0.36)', letterSpacing: '0.14em', marginTop: 8 }}>
                ✎ &nbsp; Click any field to edit
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  highlights:    Memory[];
  allMemories:   Memory[];
  coupleName:    string;
  weddingDate?:  string | null;
  weddingVenue?: string | null;
  weddingCity?:  string | null;
  readOnly?:     boolean;
}

export default function PolaroidHighlights({
  highlights,
  allMemories,
  coupleName,
  weddingDate:  weddingDateProp  = null,
  weddingVenue: weddingVenueProp = null,
  weddingCity:  weddingCityProp  = null,
  readOnly = false,
}: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker]           = useState(false);
  const [localHighlights, setLocalHighlights] = useState<Memory[]>(highlights);
  const [scrollProg, setScrollProg]           = useState(0);

  const [weddingDate,  setWeddingDate]  = useState(weddingDateProp  ?? '');
  const [weddingVenue, setWeddingVenue] = useState(weddingVenueProp ?? '');
  const [weddingCity,  setWeddingCity]  = useState(weddingCityProp  ?? '');

  useEffect(() => { setLocalHighlights(highlights); }, [highlights]);
  useEffect(() => { setWeddingDate(weddingDateProp   ?? ''); }, [weddingDateProp]);
  useEffect(() => { setWeddingVenue(weddingVenueProp ?? ''); }, [weddingVenueProp]);
  useEffect(() => { setWeddingCity(weddingCityProp   ?? ''); }, [weddingCityProp]);

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

  const handleSaved = useCallback((saved: Memory[]) => {
    setLocalHighlights(saved);
    setShowPicker(false);
  }, []);

  async function handleSaveDetails(fields: { wedding_date?: string; wedding_venue?: string; wedding_city?: string }) {
    if (fields.wedding_date  !== undefined) setWeddingDate(fields.wedding_date);
    if (fields.wedding_venue !== undefined) setWeddingVenue(fields.wedding_venue);
    if (fields.wedding_city  !== undefined) setWeddingCity(fields.wedding_city);
    await fetch('/api/couples', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
  }

  if (photos.length === 0) return null;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap');`}</style>

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

          {/* ── Floating invitation text ── */}
          <FloatingInvitation
            coupleName={coupleName}
            visible={invitationVisible}
            weddingDate={weddingDate || null}
            weddingVenue={weddingVenue || null}
            weddingCity={weddingCity || null}
            readOnly={readOnly}
            onSaveDetails={readOnly ? undefined : handleSaveDetails}
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

          {/* ── Curate button (couple view only) ── */}
          {!readOnly && (
            <motion.button
              onClick={() => setShowPicker(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position:       'absolute',
                bottom:         24,
                right:          24,
                zIndex:         50,
                background:     'rgba(201,150,74,0.12)',
                border:         '1px solid rgba(201,150,74,0.38)',
                borderRadius:   '100px',
                padding:        '8px 18px',
                color:          'rgba(232,201,123,0.9)',
                fontFamily:     '"Lato", sans-serif',
                fontSize:       '0.7rem',
                letterSpacing:  '0.12em',
                textTransform:  'uppercase',
                cursor:         'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              ✦ &nbsp; Curate Highlights
            </motion.button>
          )}
        </div>
      </section>

      {/* ── Picker modal ── */}
      <AnimatePresence>
        {showPicker && (
          <PolaroidPicker
            allMemories={allMemories}
            currentHighlights={localHighlights}
            onSave={handleSaved}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
