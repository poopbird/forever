'use client';

import { useState } from 'react';
import type { RsvpGuest, RsvpStatus, DietaryPreset } from '@/types';
import type { InvitationTheme } from '@/lib/couple';
import { CARD_THEMES } from '@/components/highlights/PolaroidHighlights';

const DIETARY_OPTIONS: { value: DietaryPreset; label: string }[] = [
  { value: 'none',        label: 'No restrictions' },
  { value: 'vegetarian',  label: 'Vegetarian' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'halal',       label: 'Halal' },
  { value: 'kosher',      label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten-free' },
];

interface Props {
  guest:              RsvpGuest;
  invitationTheme:    InvitationTheme;
  attendingPhotoUrl:  string | null;
  decliningPhotoUrl:  string | null;
}

export default function RsvpForm({ guest, invitationTheme, attendingPhotoUrl, decliningPhotoUrl }: Props) {
  const t = CARD_THEMES[invitationTheme] ?? CARD_THEMES.polaroid_white;

  // The form section always renders on a dark #0d0b08 background.
  // Light-frame themes (polaroid_white, garden_bloom) have dark-text theme colors
  // designed for their white/cream backgrounds — substitute readable light equivalents.
  const hasLightFrame = t.frameBg === '#ffffff' || t.frameBg === '#f3ead8';
  const onDark = {
    label:     hasLightFrame ? 'rgba(201,150,74,0.70)'               : t.eyebrowColor,
    value:     hasLightFrame ? 'rgba(232,213,176,0.90)'              : t.valueColor,
    rule:      hasLightFrame ? 'rgba(255,255,255,0.12)'              : t.ruleColor,
    name:      hasLightFrame ? 'rgba(232,213,176,0.96)'              : t.nameColor,
    btnBorder: hasLightFrame ? '1px solid rgba(201,150,74,0.30)'     : t.btnBorder,
    btnBg:     hasLightFrame ? 'rgba(201,150,74,0.12)'               : t.btnBg,
    btnColor:  hasLightFrame ? 'rgba(232,213,176,0.92)'              : t.btnColor,
    // card captions sit on the card's footerBg (white for light themes, dark for dark themes)
    caption:   hasLightFrame ? 'rgba(0,0,0,0.52)'                    : t.labelColor,
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

  // ── Shared input styles (always on dark #0d0b08 background) ──────────────
  const labelStyle: React.CSSProperties = {
    fontFamily:    t.btnFont,
    fontWeight:    300,
    fontStyle:     t.btnStyle ?? 'normal',
    fontSize:      '0.58rem',
    textTransform: 'uppercase',
    letterSpacing: '0.22em',
    color:         onDark.label,
    display:       'block',
    marginBottom:  6,
  };

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border:          `1px solid ${onDark.rule}`,
    borderRadius:    '3px',
    padding:         '10px 14px',
    color:           onDark.value,
    fontSize:        14,
    fontFamily:      t.btnFont,
    fontStyle:       'normal',
    outline:         'none',
  };

  // Custom chevron SVG — colour matches label tint for the current theme
  const arrowHex   = hasLightFrame ? 'C9964A' : 'ffffff';
  const arrowAlpha = hasLightFrame ? '0.75' : '0.35';
  const arrowSvg   = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23${arrowHex}' stroke-opacity='${arrowAlpha}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor:             'pointer',
    appearance:         'none' as const,
    WebkitAppearance:   'none' as const,
    backgroundImage:    arrowSvg,
    backgroundRepeat:   'no-repeat',
    backgroundPosition: 'right 14px center',
    backgroundSize:     '10px 6px',
    paddingRight:       36,
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 8px', gap: 0 }}>
        {/* Mini polaroid */}
        <div
          style={{
            background:   t.frameBg,
            boxShadow:    '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
            borderRadius: '2px',
            padding:      '8px 8px 0',
            width:        138,
            transform:    'rotate(-1.5deg)',
          }}
        >
          <div
            style={{
              width:          '100%',
              aspectRatio:    '1',
              background:     status === 'attending'
                ? 'rgba(201,150,74,0.14)'
                : 'rgba(100,100,120,0.16)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       38,
            }}
          >
            {status === 'attending' ? '🎉' : '💌'}
          </div>
          <div
            style={{
              background: t.footerBg,
              padding:    '9px 8px 18px',
              textAlign:  'center',
            }}
          >
            <p
              style={{
                fontFamily: t.nameFont,
                fontSize:   '0.85rem',
                fontWeight: t.nameWeight,
                fontStyle:  t.nameStyle,
                color:      t.nameColor,
                margin:     0,
                lineHeight: 1.2,
              }}
            >
              {status === 'attending' ? 'See you there!' : "We'll miss you"}
            </p>
          </div>
        </div>

        <p
          style={{
            marginTop:  22,
            fontFamily: t.btnFont,
            fontStyle:  t.btnStyle ?? 'normal',
            fontSize:   '0.82rem',
            color:      'rgba(232,213,176,0.82)',
            textAlign:  'center',
            lineHeight: 1.5,
          }}
        >
          {status === 'attending'
            ? "We can't wait to celebrate with you!"
            : "We'll miss you there."}
        </p>
        {email.trim() && (
          <p
            style={{
              fontFamily: t.btnFont,
              fontStyle:  t.btnStyle ?? 'normal',
              fontSize:   '0.62rem',
              letterSpacing: '0.05em',
              color:      onDark.label,
              textAlign:  'center',
              marginTop:  6,
            }}
          >
            A confirmation has been sent to {email.trim()}.
          </p>
        )}
        <button
          onClick={() => setSaved(false)}
          style={{
            marginTop:     18,
            fontFamily:    t.btnFont,
            fontStyle:     t.btnStyle ?? 'normal',
            fontSize:      '0.64rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            background:    onDark.btnBg,
            border:        onDark.btnBorder,
            color:         onDark.btnColor,
            borderRadius:  '3px',
            padding:       '9px 22px',
            cursor:        'pointer',
          }}
        >
          Edit response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Guest greeting ── */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <p
          style={{
            fontFamily:    t.btnFont,
            fontStyle:     t.btnStyle ?? 'normal',
            fontWeight:    300,
            fontSize:      '0.52rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color:         onDark.label,
            marginBottom:  8,
          }}
        >
          Welcome
        </p>
        <p
          style={{
            fontFamily:    t.nameFont,
            fontWeight:    t.nameWeight,
            fontStyle:     t.nameStyle,
            fontSize:      'clamp(1.1rem, 4vw, 1.35rem)',
            color:         onDark.name,
            margin:        '0 0 10px',
            lineHeight:    1.2,
          }}
        >
          {guest.name}
        </p>
        <p
          style={{
            fontFamily:    t.btnFont,
            fontStyle:     t.btnStyle ?? 'normal',
            fontWeight:    300,
            fontSize:      '0.58rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color:         onDark.label,
            margin:        0,
          }}
        >
          Will you be joining us?
        </p>
      </div>

      {/* ── Attendance selector — mini-polaroid buttons ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        {(['attending', 'declined'] as RsvpStatus[]).map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            style={{
              flex:         1,
              background:   t.frameBg,
              border:       'none',
              borderRadius: '2px',
              padding:      '8px 8px 0',
              cursor:       'pointer',
              transform:    status === s
                ? 'rotate(0deg) scale(1.05)'
                : i === 0 ? 'rotate(-2.5deg)' : 'rotate(2.5deg)',
              boxShadow: status === s
                ? t.frameShadow
                : '0 3px 10px rgba(0,0,0,0.45)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              opacity:    status === s ? 1 : 0.68,
            }}
          >
            {/* Photo area */}
            {(() => {
              const cardPhoto = s === 'attending' ? attendingPhotoUrl : decliningPhotoUrl;
              return (
                <div
                  style={{
                    width:          '100%',
                    aspectRatio:    '1',
                    overflow:       'hidden',
                    background:     cardPhoto
                      ? 'transparent'
                      : status === s
                        ? s === 'attending'
                          ? 'rgba(201,150,74,0.16)'
                          : 'rgba(180,60,60,0.14)'
                        : 'rgba(0,0,0,0.06)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    transition:     'all 0.2s ease',
                  }}
                >
                  {cardPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cardPhoto}
                      alt={s === 'attending' ? 'Attending' : 'Declining'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize:   22,
                        color:      status === s
                          ? s === 'attending'
                            ? 'rgba(201,150,74,0.92)'
                            : 'rgba(200,80,80,0.88)'
                          : 'rgba(255,255,255,0.30)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {s === 'attending' ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              );
            })()}
            {/* Caption */}
            <div
              style={{
                background:    t.footerBg,
                padding:       '6px 4px 10px',
                textAlign:     'center',
                fontFamily:    t.btnFont,
                fontStyle:     t.btnStyle ?? 'normal',
                fontSize:      '0.56rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         status === s ? t.btnColor : onDark.caption,
                transition:    'color 0.2s ease',
              }}
            >
              {s === 'attending' ? 'Attending' : 'Declining'}
            </div>
          </button>
        ))}
      </div>

      {/* ── Guest dietary ── */}
      {isAttending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        </div>
      )}

      {/* ── Plus one ── */}
      {showPlusOne && (
        <div
          style={{
            borderRadius: '3px',
            padding:      '14px 16px',
            display:      'flex',
            flexDirection:'column',
            gap:          14,
            border:       `1px solid ${onDark.rule}`,
            background:   'rgba(255,255,255,0.02)',
          }}
        >
          <p style={labelStyle}>Will you be bringing a plus one?</p>

          <div style={{ display: 'flex', gap: 10 }}>
            {[true, false].map(v => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setPlusOneAttending(v)}
                style={{
                  flex:         1,
                  borderRadius: '3px',
                  padding:      '9px 0',
                  fontFamily:   t.btnFont,
                  fontStyle:    t.btnStyle ?? 'normal',
                  fontSize:     '0.64rem',
                  letterSpacing:'0.1em',
                  textTransform:'uppercase',
                  cursor:       'pointer',
                  transition:   'all 0.2s ease',
                  border:       plusOneAttending === v ? onDark.btnBorder : `1px solid ${onDark.rule}`,
                  background:   plusOneAttending === v ? onDark.btnBg : 'transparent',
                  color:        plusOneAttending === v ? onDark.btnColor : onDark.label,
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

      {/* ── Email ── */}
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
          <p
            style={{
              fontFamily:    t.btnFont,
              fontStyle:     t.btnStyle ?? 'normal',
              fontSize:      '0.58rem',
              color:         onDark.label,
              marginTop:     4,
            }}
          >
            A confirmation will be sent here. Edit if needed.
          </p>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: t.btnFont, fontStyle: t.btnStyle ?? 'normal', fontSize: '0.72rem', color: 'rgba(220,100,100,0.85)' }}>
          {error}
        </p>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={saving}
        style={{
          width:         '100%',
          padding:       '12px 0',
          fontFamily:    t.btnFont,
          fontStyle:     t.btnStyle ?? 'normal',
          fontSize:      '0.7rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          background:    onDark.btnBg,
          border:        onDark.btnBorder,
          color:         onDark.btnColor,
          borderRadius:  '3px',
          cursor:        saving ? 'not-allowed' : 'pointer',
          opacity:       saving ? 0.5 : 1,
          transition:    'all 0.2s ease',
        }}
      >
        {saving ? 'Saving…' : 'Confirm RSVP'}
      </button>
    </form>
  );
}
