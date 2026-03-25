'use client';

import dynamic from 'next/dynamic';
import type { InvitationTheme } from '@/lib/couple';
import { CARD_THEMES } from '@/components/highlights/PolaroidHighlights';

const RsvpMap = dynamic(() => import('./RsvpMap'), { ssr: false });

// ─── Per-theme page-level tokens ──────────────────────────────────────────────
interface PageTheme {
  pageBg:        string;
  heading:       string;
  subtitle:      string;
  eyebrow:       string;
  infoCardBg:    string;
  infoCardBorder:string;
  infoIcon:      string;
  infoLabel:     string;
  infoValue:     string;
  infoAccent:    string;
  accent:        string;
  footerText:    string;
  footerName:    string;
  divider:       string;
  noiseOverlay:  boolean;
}

const PAGE_THEMES: Record<InvitationTheme, PageTheme> = {

  // The Curated Archive — warm off-white, ink-on-paper, Space Grotesk metadata
  polaroid_white: {
    pageBg:         '#fbf9f4',
    heading:        '#31332c',
    subtitle:       'rgba(49,51,44,0.62)',
    eyebrow:        '#5f5e5e',
    infoCardBg:     'rgba(255,255,255,0.72)',
    infoCardBorder: 'rgba(49,51,44,0.08)',
    infoIcon:       '#5f5e5e',
    infoLabel:      '#65655b',
    infoValue:      '#31332c',
    infoAccent:     '#5f5e5e',
    accent:         '#5f5e5e',
    footerText:     'rgba(49,51,44,0.42)',
    footerName:     '#5f5e5e',
    divider:        'rgba(49,51,44,0.10)',
    noiseOverlay:   false,
  },

  // The Botanical Editorial — warm cream, rose #7b5556 + sage #4f645b
  garden_bloom: {
    pageBg:         '#fbf9f5',
    heading:        '#3d2020',
    subtitle:       'rgba(60,40,40,0.62)',
    eyebrow:        '#4f645b',
    infoCardBg:     'rgba(255,255,255,0.68)',
    infoCardBorder: 'rgba(123,85,86,0.12)',
    infoIcon:       '#4f645b',
    infoLabel:      'rgba(79,100,91,0.80)',
    infoValue:      'rgba(60,40,40,0.88)',
    infoAccent:     '#7b5556',
    accent:         '#7b5556',
    footerText:     'rgba(79,100,91,0.58)',
    footerName:     '#7b5556',
    divider:        'rgba(79,100,91,0.14)',
    noiseOverlay:   false,
  },

  // The Curated Atelier — linen #fcffdc, sage #566252, ultra-minimal
  sage_linen: {
    pageBg:         '#fcffdc',
    heading:        '#38382f',
    subtitle:       'rgba(56,56,47,0.62)',
    eyebrow:        '#566252',
    infoCardBg:     'rgba(246,244,234,0.90)',
    infoCardBorder: 'rgba(86,98,82,0.14)',
    infoIcon:       '#566252',
    infoLabel:      '#65655b',
    infoValue:      '#38382f',
    infoAccent:     '#566252',
    accent:         '#566252',
    footerText:     'rgba(108,99,88,0.60)',
    footerName:     '#566252',
    divider:        'rgba(86,98,82,0.14)',
    noiseOverlay:   true,
  },

  // The Midnight Gala — deep indigo, gold #e9c176 + silver #bcc2ff
  midnight_indigo: {
    pageBg:         '#121318',
    heading:        'rgba(255,255,255,0.95)',
    subtitle:       'rgba(233,193,118,0.75)',
    eyebrow:        '#bcc2ff',
    infoCardBg:     'rgba(13,14,19,0.78)',
    infoCardBorder: 'rgba(188,194,255,0.18)',
    infoIcon:       '#bcc2ff',
    infoLabel:      'rgba(188,194,255,0.80)',
    infoValue:      'rgba(255,255,255,0.92)',
    infoAccent:     '#e9c176',
    accent:         '#e9c176',
    footerText:     'rgba(188,194,255,0.52)',
    footerName:     '#e9c176',
    divider:        'rgba(233,193,118,0.18)',
    noiseOverlay:   false,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt12h(hhmm: string): string {
  const [hStr, mStr = '00'] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Deterministic star positions for midnight_indigo bg
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 37 + 13) % 100}%`,
  top:  `${(i * 53 + 7) % 100}%`,
  size: 1 + (i % 3) * 0.4,
  op:   0.25 + (i % 5) * 0.10,
  dur:  2.2 + (i % 5) * 0.6,
  del:  (i % 9) * 0.4,
}));

// ─── SVG icons ────────────────────────────────────────────────────────────────
function CalendarIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <path d="M1.5 7h13" stroke={color} strokeWidth="1.2"/>
      <path d="M5 1.5v3M11 1.5v3" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function PinIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3.25 4 9 4 9s4-5.75 4-9c0-2.21-1.79-3.5-4-3.5z" stroke={color} strokeWidth="1.2" fill="none"/>
      <circle cx="8" cy="5.5" r="1.5" stroke={color} strokeWidth="1.2" fill="none"/>
    </svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.2" fill="none"/>
      <path d="M8 5v3.5l2.5 1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RsvpPageLayoutProps {
  invitationTheme:  InvitationTheme;
  coupleName:       string;
  guestName?:       string;
  weddingDate?:     string | null;
  weddingTimeStart?: string | null;
  weddingTimeEnd?:  string | null;
  weddingVenue?:    string | null;
  weddingCity?:     string | null;
  rsvpLockedAt?:    string | null;
  venueLatLng?:     [number, number] | null;
  children:         React.ReactNode;  // RsvpForm or status messages
}

export default function RsvpPageLayout({
  invitationTheme,
  coupleName,
  guestName,
  weddingDate,
  weddingTimeStart,
  weddingTimeEnd,
  weddingVenue,
  weddingCity,
  rsvpLockedAt,
  venueLatLng,
  children,
}: RsvpPageLayoutProps) {
  const pt = PAGE_THEMES[invitationTheme] ?? PAGE_THEMES.polaroid_white;
  const t  = CARD_THEMES[invitationTheme] ?? CARD_THEMES.polaroid_white;

  const hasStars = invitationTheme === 'midnight_indigo';

  // Formatted date / time for details panel
  const dateStr = weddingDate
    ? new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
  const timeStr = weddingTimeStart
    ? weddingTimeEnd
      ? `${fmt12h(weddingTimeStart)} — ${fmt12h(weddingTimeEnd)}`
      : fmt12h(weddingTimeStart)
    : null;
  const deadlineStr = rsvpLockedAt
    ? new Date(rsvpLockedAt + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  // ─── Details column ─────────────────────────────────────────────────────────
  const DetailsColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Heading */}
      <div>
        <p style={{
          fontFamily:    '"DM Sans", sans-serif',
          fontWeight:    300,
          fontSize:      '0.50rem',
          letterSpacing: '0.40em',
          textTransform: 'uppercase',
          color:         pt.eyebrow,
          marginBottom:  10,
        }}>
          THE CELEBRATION
        </p>
        <h2 style={{
          fontFamily:    t.nameFont,
          fontSize:      'clamp(2rem, 4vw, 2.8rem)',
          fontWeight:    t.nameWeight,
          fontStyle:     t.nameStyle,
          letterSpacing: t.nameTracking,
          color:         pt.heading,
          margin:        0,
          lineHeight:    1.1,
        }}>
          RSVP Details.
        </h2>
        {deadlineStr && (
          <p style={{
            fontFamily:    '"DM Sans", sans-serif',
            fontWeight:    300,
            fontSize:      '0.70rem',
            color:         pt.subtitle,
            marginTop:     10,
            lineHeight:    1.6,
          }}>
            Please confirm your attendance by{' '}
            <span style={{ color: pt.infoAccent, fontStyle: 'italic' }}>{deadlineStr}</span>.
          </p>
        )}
      </div>

      {/* When + Where info cards — side by side */}
      {(dateStr || timeStr || weddingVenue || weddingCity) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* When */}
          {(dateStr || timeStr) && (
            <div style={{
              background:   pt.infoCardBg,
              border:       `1px solid ${pt.infoCardBorder}`,
              borderRadius: 8,
              padding:      '18px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <CalendarIcon color={pt.infoIcon} />
                <span style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    600,
                  fontSize:      '0.80rem',
                  color:         pt.infoValue,
                  letterSpacing: '0.02em',
                }}>When</span>
              </div>
              {dateStr && (
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    400,
                  fontSize:      '0.72rem',
                  color:         pt.infoValue,
                  margin:        '0 0 4px',
                  lineHeight:    1.4,
                }}>{dateStr}</p>
              )}
              {timeStr && (
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    400,
                  fontSize:      '0.78rem',
                  color:         pt.infoAccent,
                  margin:        0,
                }}>{timeStr}</p>
              )}
            </div>
          )}

          {/* Where */}
          {(weddingVenue || weddingCity) && (
            <div style={{
              background:   pt.infoCardBg,
              border:       `1px solid ${pt.infoCardBorder}`,
              borderRadius: 8,
              padding:      '18px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <PinIcon color={pt.infoIcon} />
                <span style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    600,
                  fontSize:      '0.80rem',
                  color:         pt.infoValue,
                  letterSpacing: '0.02em',
                }}>Where</span>
              </div>
              {weddingVenue && (
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    400,
                  fontSize:      '0.72rem',
                  color:         pt.infoValue,
                  margin:        '0 0 4px',
                  lineHeight:    1.4,
                }}>{weddingVenue}</p>
              )}
              {weddingCity && (
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    400,
                  fontSize:      '0.78rem',
                  color:         pt.infoAccent,
                  margin:        0,
                }}>{weddingCity}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Time range card — full width if time is the only detail */}
      {timeStr && !dateStr && !weddingVenue && !weddingCity && (
        <div style={{
          background:   pt.infoCardBg,
          border:       `1px solid ${pt.infoCardBorder}`,
          borderRadius: 8,
          padding:      '16px 18px',
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}>
          <ClockIcon color={pt.infoIcon} />
          <span style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize:   '0.80rem',
            color:      pt.infoAccent,
          }}>{timeStr}</span>
        </div>
      )}

      {/* Map */}
      {venueLatLng && (
        <RsvpMap
          lat={venueLatLng[0]}
          lng={venueLatLng[1]}
          venue={weddingVenue}
          city={weddingCity}
          compact={false}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Manrope:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,300;1,6..72,400&family=Noto+Serif:ital,wght@0,400;1,400&family=Plus+Jakarta+Sans:wght@300;400;500&family=Space+Grotesk:wght@300;400;500&display=swap');
        @keyframes rsvp-twinkle { 0%,100%{opacity:var(--op)} 50%{opacity:calc(var(--op)*0.3)} }
      `}</style>

      <div
        style={{
          background: pt.pageBg,
          minHeight:  '100vh',
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        {/* Linen noise — sage_linen */}
        {pt.noiseOverlay && (
          <div style={{
            position:        'fixed',
            inset:           0,
            zIndex:          0,
            pointerEvents:   'none',
            opacity:         0.10,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize:  '200px 200px',
          }} />
        )}

        {/* Star field — midnight_indigo */}
        {hasStars && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
              position:   'absolute',
              inset:      0,
              background: 'radial-gradient(ellipse 70% 50% at 20% 30%, rgba(60,40,120,0.25) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(30,20,90,0.20) 0%, transparent 55%)',
            }} />
            {STARS.map((s, i) => (
              <div key={i} style={{
                position:     'absolute',
                left:         s.left,
                top:          s.top,
                width:        s.size,
                height:       s.size,
                borderRadius: '50%',
                background:   '#fff',
                opacity:      s.op,
                animation:    `rsvp-twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
                '--op':       s.op,
              } as React.CSSProperties} />
            ))}
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div
          style={{
            position:  'relative',
            zIndex:    1,
            maxWidth:  1120,
            margin:    '0 auto',
            padding:   'clamp(40px,6vw,80px) clamp(20px,5vw,60px)',
          }}
        >
          {/* ── Desktop: 2-column grid ── */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 items-start"
            style={{ gap: 'clamp(40px,6vw,80px)' }}
          >
            {/* ── LEFT: Form column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Heading block */}
              <div>
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    300,
                  fontSize:      '0.50rem',
                  letterSpacing: '0.42em',
                  textTransform: 'uppercase',
                  color:         pt.eyebrow,
                  marginBottom:  12,
                }}>
                  ✦ &nbsp; You are invited &nbsp; ✦
                </p>
                <h1 style={{
                  fontFamily:    t.nameFont,
                  fontSize:      'clamp(2rem, 5vw, 3rem)',
                  fontWeight:    t.nameWeight,
                  fontStyle:     t.nameStyle,
                  letterSpacing: t.nameTracking,
                  color:         pt.heading,
                  margin:        '0 0 8px',
                  lineHeight:    1.1,
                }}>
                  {coupleName}
                </h1>
                {guestName && (
                  <p style={{
                    fontFamily:    '"DM Sans", sans-serif',
                    fontWeight:    300,
                    fontSize:      'clamp(0.75rem, 1.8vw, 0.90rem)',
                    color:         pt.subtitle,
                    margin:        0,
                    letterSpacing: '0.02em',
                  }}>
                    Your presence is requested
                  </p>
                )}
              </div>

              {/* Form / status content */}
              {children}

              {/* Footer */}
              <div style={{ textAlign: 'center', paddingTop: 12 }}>
                <div style={{
                  width:     60,
                  height:    1,
                  background: pt.divider,
                  margin:    '0 auto 16px',
                }} />
                <p style={{
                  fontFamily:    t.nameFont,
                  fontStyle:     'italic',
                  fontSize:      'clamp(1rem, 2.5vw, 1.25rem)',
                  fontWeight:    t.nameWeight,
                  color:         pt.footerName,
                  margin:        '0 0 6px',
                }}>
                  With Love,
                </p>
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    300,
                  fontSize:      '0.56rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color:         pt.footerText,
                  margin:        0,
                }}>
                  {coupleName}
                  {weddingDate && ` · ${new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`}
                </p>
              </div>
            </div>

            {/* ── RIGHT: Details column (desktop only — hidden on mobile) ── */}
            <div className="hidden md:block">
              {DetailsColumn}
            </div>
          </div>

          {/* ── Mobile: Details section below (md and below) ── */}
          <div className="block md:hidden" style={{ marginTop: 48 }}>
            <div style={{
              width:     40,
              height:    1,
              background: pt.divider,
              margin:    '0 auto 32px',
            }} />
            {DetailsColumn}
            {/* Mobile map — compact */}
            {venueLatLng && (
              <div style={{ marginTop: 16 }}>
                <RsvpMap
                  lat={venueLatLng[0]}
                  lng={venueLatLng[1]}
                  venue={weddingVenue}
                  city={weddingCity}
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
