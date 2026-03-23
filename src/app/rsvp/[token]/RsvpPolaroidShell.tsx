'use client';

import { CARD_THEMES } from '@/components/highlights/PolaroidHighlights';
import type { InvitationTheme } from '@/lib/couple';

// Deterministic star positions — mirrors PolaroidHighlights to avoid SSR mismatch
const STAR_DATA = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37 + 13) % 100}%`,
  top:  `${(i * 53 + 7) % 100}%`,
  size: 1 + (i % 3) * 0.5,
  op:   0.45 + (i % 4) * 0.14,
  dur:  2 + (i % 5) * 0.6,
  del:  (i % 8) * 0.4,
}));

function fmt12h(hhmm: string): string {
  const [hStr, mStr = '00'] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
}

interface RsvpPolaroidShellProps {
  invitationTheme: InvitationTheme;
  coupleName:       string;
  weddingDate?:     string | null;
  weddingTimeStart?: string | null;
  weddingTimeEnd?:  string | null;
  weddingVenue?:    string | null;
  weddingCity?:     string | null;
  children:         React.ReactNode;
}

export default function RsvpPolaroidShell({
  invitationTheme,
  coupleName,
  weddingDate,
  weddingTimeStart,
  weddingTimeEnd,
  weddingVenue,
  weddingCity,
  children,
}: RsvpPolaroidShellProps) {
  const t = CARD_THEMES[invitationTheme] ?? CARD_THEMES.polaroid_white;

  // Build the detail line for the caption footer
  const detailParts: string[] = [];
  if (weddingDate) {
    detailParts.push(
      new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    );
  }
  if (weddingTimeStart) {
    detailParts.push(
      weddingTimeEnd
        ? `${fmt12h(weddingTimeStart)} – ${fmt12h(weddingTimeEnd)}`
        : fmt12h(weddingTimeStart)
    );
  }
  if (weddingVenue) detailParts.push(weddingVenue);
  if (weddingCity)  detailParts.push(weddingCity);
  const detailLine = detailParts.join(' · ');

  return (
    <div
      style={{
        background:   t.frameBg,
        boxShadow:    t.frameShadow,
        borderRadius: '2px',
        // Polaroid border: equal top/sides, 0 bottom — footer provides the bottom space
        padding:      '10px 10px 0',
        position:     'relative',
        overflow:     'hidden',
        transform:    'rotate(-1.2deg)',
        width:        'min(420px, 92vw)',
      }}
    >
      {/* ── Linen noise overlay — sage_linen only ── */}
      {t.hasNoise && (
        <div
          style={{
            position:        'absolute',
            inset:           0,
            zIndex:          3,
            pointerEvents:   'none',
            opacity:         0.16,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize:  '200px 200px',
          }}
        />
      )}

      {/* ── Dark "photo" section — holds the form ── */}
      <div
        style={{
          position:   'relative',
          background: '#0d0b08',
          zIndex:     1,
          overflow:   'hidden',
        }}
      >
        {/* Stars — midnight_indigo only */}
        {t.hasStars && (
          <>
            <div
              style={{
                position:      'absolute',
                inset:         0,
                background:    'radial-gradient(ellipse 60% 40% at 30% 60%, rgba(80,60,140,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 75% 25%, rgba(40,60,120,0.18) 0%, transparent 55%)',
                pointerEvents: 'none',
              }}
            />
            {STAR_DATA.map((s, i) => (
              <div
                key={i}
                style={{
                  position:      'absolute',
                  left:          s.left,
                  top:           s.top,
                  width:         s.size,
                  height:        s.size,
                  borderRadius:  '50%',
                  background:    '#fff',
                  animation:     `inv-twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
                  opacity:       s.op,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </>
        )}

        {/* Botanical SVG — garden_bloom only */}
        {t.hasGarden && (
          <svg
            style={{
              position:      'absolute',
              bottom:        0,
              right:         0,
              opacity:       0.12,
              pointerEvents: 'none',
              zIndex:        2,
            }}
            width="160" height="160" viewBox="0 0 140 140" fill="none"
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

        {/* Form content */}
        <div style={{ padding: '28px 24px', position: 'relative', zIndex: 3 }}>
          {/* Eyebrow */}
          <p
            style={{
              fontFamily:    '"DM Sans", sans-serif',
              fontWeight:    300,
              fontSize:      '0.52rem',
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              color:         t.eyebrowColor,
              textAlign:     'center',
              marginBottom:  20,
            }}
          >
            ✦ &nbsp; You are invited &nbsp; ✦
          </p>
          {children}
        </div>
      </div>

      {/* ── Caption footer — couple name + details ── */}
      <div
        style={{
          background: t.footerBg,
          padding:    '18px 16px 30px',
          textAlign:  'center',
          position:   'relative',
          zIndex:     2,
        }}
      >
        <p
          style={{
            fontFamily:    t.nameFont,
            fontSize:      'clamp(1.4rem, 5.5vw, 1.9rem)',
            fontWeight:    t.nameWeight,
            fontStyle:     t.nameStyle,
            letterSpacing: t.nameTracking,
            color:         t.nameColor,
            margin:        0,
            lineHeight:    1.1,
          }}
        >
          {coupleName}
        </p>
        {detailLine && (
          <p
            style={{
              fontFamily:    '"DM Sans", sans-serif',
              fontWeight:    300,
              fontSize:      '0.58rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color:         t.labelColor,
              margin:        '8px 0 0',
            }}
          >
            {detailLine}
          </p>
        )}
      </div>
    </div>
  );
}
