'use client';

import { CARD_THEMES } from '@/components/highlights/PolaroidHighlights';
import type { InvitationTheme } from '@/lib/couple';
import { storageUrl } from '@/lib/storageUrl';

// Deterministic star positions — mirrors PolaroidHighlights to avoid SSR mismatch
const STAR_DATA = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37 + 13) % 100}%`,
  top:  `${(i * 53 + 7) % 100}%`,
  size: 1 + (i % 3) * 0.5,
  op:   0.45 + (i % 4) * 0.14,
  dur:  2 + (i % 5) * 0.6,
  del:  (i % 8) * 0.4,
}));

// Deterministic side-photo layout (rotation + vertical stagger)
const SIDE_DATA = [
  { rot: -3.2, mt: 0   },
  { rot:  2.1, mt: 32  },
  { rot: -1.8, mt: 18  },
  { rot:  2.8, mt: 8   },
  { rot: -2.4, mt: 44  },
  { rot:  1.5, mt: 22  },
];

function fmt12h(hhmm: string): string {
  const [hStr, mStr = '00'] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
}

interface RsvpPolaroidShellProps {
  invitationTheme:     InvitationTheme;
  coupleName:          string;
  weddingDate?:        string | null;
  weddingTimeStart?:   string | null;
  weddingTimeEnd?:     string | null;
  weddingVenue?:       string | null;
  weddingCity?:        string | null;
  invitationPhotoUrl?: string | null;
  sidePhotos?:         string[];
  children:            React.ReactNode;
}

export default function RsvpPolaroidShell({
  invitationTheme,
  coupleName,
  weddingDate,
  weddingTimeStart,
  weddingTimeEnd,
  weddingVenue,
  weddingCity,
  invitationPhotoUrl,
  sidePhotos = [],
  children,
}: RsvpPolaroidShellProps) {
  const t = CARD_THEMES[invitationTheme] ?? CARD_THEMES.polaroid_white;
  const hasLightFrame = t.frameBg === '#ffffff' || t.frameBg === '#f3ead8';

  // Divider separating info section from form section
  const dividerRule = hasLightFrame ? 'rgba(0,0,0,0.10)' : t.ruleColor;
  const dividerText = hasLightFrame ? 'rgba(0,0,0,0.28)' : t.labelColor;

  // Formatted date / time
  const dateStr = weddingDate
    ? new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
  const timeStr = weddingTimeStart
    ? weddingTimeEnd
      ? `${fmt12h(weddingTimeStart)} – ${fmt12h(weddingTimeEnd)}`
      : fmt12h(weddingTimeStart)
    : null;

  const leftPhotos  = sidePhotos.slice(0, 3);
  const rightPhotos = sidePhotos.slice(3, 6);

  // Shared label/value row style helpers for the info section
  const infoRowLabel: React.CSSProperties = {
    fontFamily:    '"DM Sans", sans-serif',
    fontWeight:    300,
    fontSize:      '0.52rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color:         t.labelColor,
    flexShrink:    0,
  };
  const infoRowValue: React.CSSProperties = {
    fontFamily:    '"DM Sans", sans-serif',
    fontWeight:    400,
    fontSize:      '0.60rem',
    letterSpacing: '0.04em',
    color:         t.valueColor,
    textAlign:     'right',
    flex:          1,
  };

  const noiseStyle: React.CSSProperties = {
    position:        'absolute',
    inset:           0,
    zIndex:          10,
    pointerEvents:   'none',
    opacity:         0.16,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundSize:  '200px 200px',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>

      {/* ── Left side memory polaroids (xl+ only) ── */}
      {leftPhotos.length > 0 && (
        <div
          className="hidden xl:flex"
          style={{ flexDirection: 'column', paddingRight: 28, paddingTop: 100 }}
        >
          {leftPhotos.map((url, i) => (
            <div
              key={i}
              style={{
                background:   t.frameBg,
                padding:      '6px 6px 0',
                borderRadius: '2px',
                boxShadow:    '0 4px 18px rgba(0,0,0,0.50)',
                width:        148,
                transform:    `rotate(${SIDE_DATA[i].rot}deg)`,
                marginTop:    i === 0 ? 0 : SIDE_DATA[i].mt,
                flexShrink:   0,
              }}
            >
              <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(url, { width: 300, quality: 75 })}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ background: t.footerBg, height: 22 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Center polaroid card ── */}
      <div
        style={{
          background:   t.frameBg,
          boxShadow:    t.frameShadow,
          borderRadius: '2px',
          padding:      '10px 10px 0',
          position:     'relative',
          overflow:     'hidden',
          transform:    'rotate(-1.2deg)',
          width:        'min(460px, 92vw)',
          flexShrink:   0,
        }}
      >
        {/* Linen noise overlay — sage_linen only */}
        {t.hasNoise && <div style={noiseStyle} />}

        {/* ── Photo section (1:1) ── */}
        <div
          style={{
            position:    'relative',
            width:       '100%',
            aspectRatio: '1',
            overflow:    'hidden',
            background:  invitationPhotoUrl ? 'transparent' : t.photoFallback,
          }}
        >
          {invitationPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storageUrl(invitationPhotoUrl, { width: 600, quality: 85 })}
              alt={coupleName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            // Theme decoration when no photo is set
            <>
              {t.hasGarden && (
                <svg
                  style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.30, pointerEvents: 'none' }}
                  width="200" height="200" viewBox="0 0 140 140" fill="none"
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
              {t.hasStars && (
                <>
                  <div
                    style={{
                      position:      'absolute',
                      inset:         0,
                      background:    'radial-gradient(ellipse 60% 40% at 30% 60%, rgba(80,60,140,0.35) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 75% 25%, rgba(40,60,120,0.28) 0%, transparent 55%)',
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
            </>
          )}
        </div>

        {/* ── Info section: couple name + wedding details (frame bg) ── */}
        <div
          style={{
            background: t.footerBg,
            padding:    '20px 22px 14px',
            textAlign:  'center',
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontFamily:    '"DM Sans", sans-serif',
              fontWeight:    300,
              fontSize:      '0.46rem',
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              color:         t.eyebrowColor,
              marginBottom:  10,
            }}
          >
            ✦ &nbsp; You are invited &nbsp; ✦
          </p>

          {/* Couple name */}
          <p
            style={{
              fontFamily:    t.nameFont,
              fontSize:      'clamp(1.35rem, 5.2vw, 1.85rem)',
              fontWeight:    t.nameWeight,
              fontStyle:     t.nameStyle,
              letterSpacing: t.nameTracking,
              color:         t.nameColor,
              margin:        0,
              lineHeight:    1.15,
            }}
          >
            {coupleName}
          </p>

          {/* Wedding detail rows */}
          {(dateStr || timeStr || weddingVenue || weddingCity) && (
            <div
              style={{
                borderTop:  `1px solid ${t.ruleColor}`,
                marginTop:  14,
                paddingTop: 12,
                display:    'flex',
                flexDirection: 'column',
                gap:        6,
              }}
            >
              {dateStr && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={infoRowLabel}>Date</span>
                  <span style={infoRowValue}>{dateStr}</span>
                </div>
              )}
              {timeStr && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={infoRowLabel}>Time</span>
                  <span style={infoRowValue}>{timeStr}</span>
                </div>
              )}
              {weddingVenue && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={infoRowLabel}>Venue</span>
                  <span style={infoRowValue}>{weddingVenue}</span>
                </div>
              )}
              {weddingCity && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={infoRowLabel}>Location</span>
                  <span style={infoRowValue}>{weddingCity}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── "Your RSVP" divider ── */}
        <div
          style={{
            background: t.footerBg,
            padding:    '0 22px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: dividerRule }} />
            <p
              style={{
                fontFamily:    '"DM Sans", sans-serif',
                fontWeight:    300,
                fontSize:      '0.46rem',
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color:         dividerText,
                margin:        0,
                whiteSpace:    'nowrap',
              }}
            >
              Your RSVP
            </p>
            <div style={{ flex: 1, height: 1, background: dividerRule }} />
          </div>
        </div>

        {/* ── Dark form section ── */}
        <div
          style={{
            position:   'relative',
            background: '#0d0b08',
            zIndex:     1,
            overflow:   'hidden',
          }}
        >
          {/* Stars — midnight_indigo */}
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

          {/* Botanical SVG — garden_bloom */}
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
          <div style={{ padding: '24px 24px 28px', position: 'relative', zIndex: 3 }}>
            {children}
          </div>
        </div>

        {/* Bottom padding to close the polaroid frame */}
        <div style={{ background: t.footerBg, height: 8 }} />
      </div>

      {/* ── Right side memory polaroids (xl+ only) ── */}
      {rightPhotos.length > 0 && (
        <div
          className="hidden xl:flex"
          style={{ flexDirection: 'column', paddingLeft: 28, paddingTop: 60 }}
        >
          {rightPhotos.map((url, i) => (
            <div
              key={i}
              style={{
                background:   t.frameBg,
                padding:      '6px 6px 0',
                borderRadius: '2px',
                boxShadow:    '0 4px 18px rgba(0,0,0,0.50)',
                width:        148,
                transform:    `rotate(${SIDE_DATA[i + 3].rot}deg)`,
                marginTop:    i === 0 ? 0 : SIDE_DATA[i + 3].mt,
                flexShrink:   0,
              }}
            >
              <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(url, { width: 300, quality: 75 })}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ background: t.footerBg, height: 22 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
