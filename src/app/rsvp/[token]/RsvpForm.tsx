'use client';

import { useState } from 'react';
import type { RsvpGuest, RsvpStatus, DietaryPreset } from '@/types';
import type { InvitationTheme } from '@/lib/couple';
import { CARD_THEMES } from '@/components/highlights/PolaroidHighlights';
import { storageUrl } from '@/lib/storageUrl';

const DIETARY_OPTIONS: { value: DietaryPreset; label: string }[] = [
  { value: 'none',        label: 'No restrictions' },
  { value: 'vegetarian',  label: 'Vegetarian' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'halal',       label: 'Halal' },
  { value: 'kosher',      label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten-free' },
];

interface Props {
  guest:             RsvpGuest;
  invitationTheme:   InvitationTheme;
  attendingPhotoUrl: string | null;
  decliningPhotoUrl: string | null;
}

export default function RsvpForm({ guest, invitationTheme, attendingPhotoUrl, decliningPhotoUrl }: Props) {
  const t = CARD_THEMES[invitationTheme] ?? CARD_THEMES.polaroid_white;

  // Page-aware color tokens — RsvpForm now renders on the theme page bg
  const isLight = invitationTheme === 'polaroid_white';

  const fc = {
    // form card surface
    cardBg:      isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)',
    cardBorder:  isLight ? 'rgba(0,0,0,0.08)'       : t.ruleColor,
    // labels + inputs
    label:       isLight ? 'rgba(0,0,0,0.44)'        : t.eyebrowColor,
    value:       isLight ? 'rgba(0,0,0,0.82)'        : t.valueColor,
    inputBg:     isLight ? 'rgba(0,0,0,0.04)'        : 'rgba(255,255,255,0.05)',
    inputBorder: isLight ? 'rgba(0,0,0,0.12)'        : t.ruleColor,
    inputText:   isLight ? 'rgba(0,0,0,0.80)'        : t.valueColor,
    // submit button — solid accent
    btnBg:    isLight
      ? '#c9964a'
      : invitationTheme === 'garden_bloom' ? '#6a8f58'
      : invitationTheme === 'sage_linen'   ? '#7a9268'
      : '#c9964a',   // midnight_indigo
    btnText:  isLight ? '#ffffff' : (invitationTheme === 'garden_bloom' ? 'rgba(235,245,225,0.96)' : '#ffffff'),
    // inline toggle buttons (yes/no)
    toggleBg:       isLight ? 'rgba(0,0,0,0.06)'    : 'rgba(255,255,255,0.06)',
    toggleBorder:   isLight ? 'rgba(0,0,0,0.14)'    : t.ruleColor,
    toggleActiveBg: isLight ? '#c9964a'              : t.btnBg,
    toggleActiveText: isLight ? '#ffffff'            : t.btnColor,
    toggleActiveBorder: isLight ? 'none'             : t.btnBorder,
    // sub-note text
    note: isLight ? 'rgba(0,0,0,0.38)' : t.labelColor,
    // edit response button
    editBg:     isLight ? 'rgba(0,0,0,0.06)'   : 'rgba(255,255,255,0.07)',
    editBorder: isLight ? 'rgba(0,0,0,0.12)'   : t.ruleColor,
    editText:   isLight ? 'rgba(0,0,0,0.60)'   : t.labelColor,
  };

  const [status,            setStatus]            = useState<RsvpStatus>(guest.rsvp_status);
  const [plusOneAttending,  setPlusOneAttending]  = useState<boolean | null>(guest.plus_one_attending);
  const [plusOneName,       setPlusOneName]       = useState(guest.plus_one_name ?? '');
  const [dietaryPreset,     setDietaryPreset]     = useState<DietaryPreset | ''>(guest.dietary_preset ?? '');
  const [dietaryNotes,      setDietaryNotes]      = useState(guest.dietary_notes ?? '');
  const [plusDietaryPreset, setPlusDietaryPreset] = useState<DietaryPreset | ''>(guest.plus_one_dietary_preset ?? '');
  const [plusDietaryNotes,  setPlusDietaryNotes]  = useState(guest.plus_one_dietary_notes ?? '');
  const [email,             setEmail]             = useState(guest.email ?? '');
  const [saving,            setSaving]            = useState(false);
  const [saved,             setSaved]             = useState(false);
  const [error,             setError]             = useState('');

  const isAttending    = status === 'attending';
  const showPlusOne    = isAttending && guest.plus_one_invited;
  const plusOneIsGoing = plusOneAttending === true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload: Record<string, unknown> = {
      rsvp_status:    status,
      dietary_preset: dietaryPreset || null,
      dietary_notes:  dietaryNotes.trim() || null,
      email:          email.trim() || null,
    };

    if (showPlusOne) {
      payload.plus_one_attending      = plusOneAttending;
      payload.plus_one_name           = plusOneIsGoing ? plusOneName.trim() || null : null;
      payload.plus_one_dietary_preset = plusOneIsGoing ? (plusDietaryPreset || null) : null;
      payload.plus_one_dietary_notes  = plusOneIsGoing ? (plusDietaryNotes.trim() || null) : null;
    }

    const res = await fetch(`/api/rsvp/${guest.token}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Unknown error' }));
      setError(msg ?? 'Something went wrong');
      return;
    }

    setSaved(true);
    fetch('/api/email/confirmation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: guest.token }),
    }).catch(() => {/* silent */});
  }

  // ── Shared input styles ────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    fontFamily:    '"DM Sans", sans-serif',
    fontWeight:    300,
    fontSize:      '0.56rem',
    textTransform: 'uppercase',
    letterSpacing: '0.24em',
    color:         fc.label,
    display:       'block',
    marginBottom:  7,
  };

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    backgroundColor: fc.inputBg,
    border:          `1px solid ${fc.inputBorder}`,
    borderRadius:    4,
    padding:         '10px 14px',
    color:           fc.inputText,
    fontSize:        '0.85rem',
    fontFamily:      '"DM Sans", sans-serif',
    outline:         'none',
    boxSizing:       'border-box',
  };

  const arrowHex   = isLight ? 'A06428' : 'ffffff';
  const arrowAlpha = isLight ? '0.65'   : '0.30';
  const arrowSvg   = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23${arrowHex}' stroke-opacity='${arrowAlpha}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor:             'pointer',
    appearance:         'none' as const,
    WebkitAppearance:   'none' as const,
    backgroundImage:    `${arrowSvg}, none`,
    backgroundRepeat:   'no-repeat',
    backgroundPosition: 'right 14px center',
    backgroundSize:     '10px 6px',
    backgroundBlendMode:'normal',
    paddingRight:       36,
    backgroundColor:    fc.inputBg,
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            0,
        padding:        '8px 0',
      }}>
        {/* Large success polaroid */}
        <div style={{
          background:   t.frameBg,
          boxShadow:    isLight
            ? '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)'
            : '0 8px 32px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)',
          borderRadius: 2,
          padding:      '10px 10px 0',
          width:        160,
          transform:    'rotate(-1.5deg)',
        }}>
          <div style={{
            width:          '100%',
            aspectRatio:    '1',
            background:     status === 'attending'
              ? 'rgba(201,150,74,0.14)'
              : 'rgba(100,100,120,0.16)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       44,
          }}>
            {status === 'attending' ? '🎉' : '💌'}
          </div>
          <div style={{
            background: t.footerBg,
            padding:    '10px 8px 20px',
            textAlign:  'center',
          }}>
            <p style={{
              fontFamily: t.nameFont,
              fontSize:   '0.90rem',
              fontWeight: t.nameWeight,
              fontStyle:  t.nameStyle,
              color:      t.nameColor,
              margin:     0,
              lineHeight: 1.2,
            }}>
              {status === 'attending' ? 'See you there!' : "We'll miss you"}
            </p>
          </div>
        </div>

        <p style={{
          marginTop:     22,
          fontFamily:    '"DM Sans", sans-serif',
          fontWeight:    300,
          fontSize:      '0.85rem',
          color:         fc.value,
          textAlign:     'center',
          lineHeight:    1.6,
        }}>
          {status === 'attending'
            ? "We can't wait to celebrate with you!"
            : "We'll miss you there."}
        </p>

        {email.trim() && (
          <p style={{
            fontFamily:    '"DM Sans", sans-serif',
            fontWeight:    300,
            fontSize:      '0.62rem',
            letterSpacing: '0.05em',
            color:         fc.note,
            textAlign:     'center',
            marginTop:     4,
          }}>
            A confirmation has been sent to {email.trim()}.
          </p>
        )}

        <button
          onClick={() => setSaved(false)}
          style={{
            marginTop:     20,
            fontFamily:    '"DM Sans", sans-serif',
            fontWeight:    400,
            fontSize:      '0.60rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            background:    fc.editBg,
            border:        `1px solid ${fc.editBorder}`,
            color:         fc.editText,
            borderRadius:  4,
            padding:       '9px 24px',
            cursor:        'pointer',
          }}
        >
          Edit response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Guest greeting ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontFamily:    '"DM Sans", sans-serif',
          fontWeight:    300,
          fontSize:      '0.52rem',
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          color:         fc.label,
          marginBottom:  6,
        }}>
          Welcome
        </p>
        <p style={{
          fontFamily:    t.nameFont,
          fontWeight:    t.nameWeight,
          fontStyle:     t.nameStyle,
          fontSize:      'clamp(1.1rem, 4vw, 1.4rem)',
          color:         fc.value,
          margin:        '0 0 4px',
          lineHeight:    1.2,
        }}>
          {guest.name}
        </p>
        <p style={{
          fontFamily:    '"DM Sans", sans-serif',
          fontWeight:    300,
          fontSize:      '0.62rem',
          letterSpacing: '0.10em',
          color:         fc.note,
          margin:        0,
        }}>
          Will you be joining us?
        </p>
      </div>

      {/* ── Attendance cards — large polaroid buttons ─────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(['attending', 'declined'] as RsvpStatus[]).map((s, i) => {
          const isSelected  = status === s;
          const cardPhoto   = s === 'attending' ? attendingPhotoUrl : decliningPhotoUrl;
          const photoSrc    = cardPhoto ? storageUrl(cardPhoto, { width: 600, quality: 85 }) : null;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              style={{
                flex:         1,
                background:   t.frameBg,
                border:       'none',
                borderRadius: 2,
                padding:      '8px 8px 0',
                cursor:       'pointer',
                transform:    isSelected
                  ? 'rotate(0deg) scale(1.04)'
                  : i === 0 ? 'rotate(-2deg)' : 'rotate(2deg)',
                boxShadow:    isSelected
                  ? (isLight
                      ? '0 8px 24px rgba(0,0,0,0.22), 0 0 0 2px #c9964a'
                      : `0 8px 28px rgba(0,0,0,0.55), 0 0 0 2px ${fc.btnBg}`)
                  : '0 3px 12px rgba(0,0,0,0.30)',
                opacity:      isSelected ? 1 : 0.62,
                transition:   'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              {/* Photo */}
              <div style={{
                width:          '100%',
                aspectRatio:    '1',
                overflow:       'hidden',
                background:     photoSrc
                  ? 'transparent'
                  : isSelected
                    ? s === 'attending'
                      ? 'rgba(201,150,74,0.16)'
                      : 'rgba(100,100,120,0.16)'
                    : 'rgba(120,120,120,0.08)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                transition:     'background 0.2s ease',
              }}>
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    alt={s === 'attending' ? 'Attending' : 'Declining'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span style={{
                    fontSize:   28,
                    color:      isSelected
                      ? s === 'attending' ? 'rgba(201,150,74,0.90)' : 'rgba(160,100,100,0.80)'
                      : 'rgba(150,150,150,0.30)',
                    transition: 'all 0.2s ease',
                  }}>
                    {s === 'attending' ? '✓' : '✗'}
                  </span>
                )}
              </div>

              {/* Caption footer */}
              <div style={{
                background: t.footerBg,
                padding:    '8px 6px 16px',
                textAlign:  'center',
              }}>
                <p style={{
                  fontFamily:    t.nameFont,
                  fontWeight:    t.nameWeight,
                  fontStyle:     t.nameStyle,
                  fontSize:      'clamp(0.75rem, 2.5vw, 0.95rem)',
                  color:         t.nameColor,
                  margin:        '0 0 2px',
                  lineHeight:    1.2,
                }}>
                  {s === 'attending' ? 'Joyfully Attend' : 'Regretfully Decline'}
                </p>
                <p style={{
                  fontFamily:    '"DM Sans", sans-serif',
                  fontWeight:    300,
                  fontStyle:     'normal',
                  fontSize:      '0.46rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color:         t.labelColor,
                  margin:        0,
                }}>
                  {s === 'attending' ? "I'll be there" : 'Regretfully absent'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Form card ─────────────────────────────────────────────────────── */}
      <div style={{
        background:    fc.cardBg,
        border:        `1px solid ${fc.cardBorder}`,
        borderRadius:  8,
        padding:       '22px 20px',
        display:       'flex',
        flexDirection: 'column',
        gap:           18,
        backdropFilter: 'blur(8px)',
      }}>

        {/* Guest dietary — only when attending */}
        {isAttending && (
          <>
            <div>
              <label style={labelStyle}>Your dietary requirements</label>
              <select
                value={dietaryPreset}
                onChange={e => setDietaryPreset(e.target.value as DietaryPreset | '')}
                style={selectStyle}
              >
                <option value="">Select…</option>
                {DIETARY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Any other dietary notes? (optional)</label>
              <textarea
                value={dietaryNotes}
                onChange={e => setDietaryNotes(e.target.value)}
                rows={2}
                placeholder="e.g. severe nut allergy"
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
          </>
        )}

        {/* Plus one — expands inside form card */}
        {showPlusOne && (
          <div style={{
            borderRadius: 4,
            padding:      '14px 16px',
            display:      'flex',
            flexDirection:'column',
            gap:          14,
            border:       `1px solid ${fc.inputBorder}`,
            background:   isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.02)',
          }}>
            <p style={labelStyle}>Will you be bringing a plus one?</p>

            <div style={{ display: 'flex', gap: 10 }}>
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setPlusOneAttending(v)}
                  style={{
                    flex:          1,
                    borderRadius:  4,
                    padding:       '9px 0',
                    fontFamily:    '"DM Sans", sans-serif',
                    fontWeight:    400,
                    fontSize:      '0.64rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor:        'pointer',
                    transition:    'all 0.2s ease',
                    border:        plusOneAttending === v
                      ? fc.toggleActiveBorder
                      : `1px solid ${fc.toggleBorder}`,
                    background:    plusOneAttending === v ? fc.toggleActiveBg   : fc.toggleBg,
                    color:         plusOneAttending === v ? fc.toggleActiveText : fc.label,
                  }}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>

            {plusOneIsGoing && (
              <>
                <div>
                  <label style={labelStyle}>Plus one name (optional)</label>
                  <input
                    type="text"
                    value={plusOneName}
                    onChange={e => setPlusOneName(e.target.value)}
                    placeholder="Their name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Plus one dietary requirements</label>
                  <select
                    value={plusDietaryPreset}
                    onChange={e => setPlusDietaryPreset(e.target.value as DietaryPreset | '')}
                    style={selectStyle}
                  >
                    <option value="">Select…</option>
                    {DIETARY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Plus one dietary notes (optional)</label>
                  <textarea
                    value={plusDietaryNotes}
                    onChange={e => setPlusDietaryNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. lactose intolerant"
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Email */}
        <div>
          <label style={labelStyle}>
            Email address{!guest.email && ' (optional — for confirmation)'}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
          />
          {guest.email && (
            <p style={{
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: 300,
              fontSize:   '0.58rem',
              color:      fc.note,
              marginTop:  4,
            }}>
              A confirmation will be sent here. Edit if needed.
            </p>
          )}
        </div>

        {error && (
          <p style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize:   '0.72rem',
            color:      'rgba(220,100,100,0.88)',
          }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width:         '100%',
            padding:       '13px 0',
            fontFamily:    '"DM Sans", sans-serif',
            fontWeight:    500,
            fontSize:      '0.68rem',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            background:    fc.btnBg,
            border:        'none',
            color:         fc.btnText,
            borderRadius:  6,
            cursor:        saving ? 'not-allowed' : 'pointer',
            opacity:       saving ? 0.55 : 1,
            transition:    'opacity 0.2s ease, transform 0.15s ease',
            boxShadow:     isLight
              ? '0 4px 16px rgba(201,150,74,0.30)'
              : '0 4px 16px rgba(0,0,0,0.30)',
          }}
        >
          {saving ? 'Saving…' : 'Confirm My Response →'}
        </button>
      </div>
    </form>
  );
}
