'use client';

import { useState } from 'react';
import type { RsvpGuest, RsvpStatus, DietaryPreset } from '@/types';

const DIETARY_OPTIONS: { value: DietaryPreset; label: string }[] = [
  { value: 'none',        label: 'No restrictions' },
  { value: 'vegetarian',  label: 'Vegetarian' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'halal',       label: 'Halal' },
  { value: 'kosher',      label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten-free' },
];

interface Props {
  guest: RsvpGuest;
}

export default function RsvpForm({ guest }: Props) {
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
      payload.plus_one_attending           = plusOneAttending;
      payload.plus_one_name                = plusOneIsGoing ? plusOneName.trim() || null : null;
      payload.plus_one_dietary_preset      = plusOneIsGoing ? (plusDietaryPreset || null) : null;
      payload.plus_one_dietary_notes       = plusOneIsGoing ? (plusDietaryNotes.trim() || null) : null;
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

    // Fire confirmation email best-effort — don't block UI on failure
    fetch('/api/email/confirmation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: guest.token }),
    }).catch(() => {/* silent */});
  }

  const gold  = 'rgba(201,150,74,';
  const cream = 'rgba(232,213,176,';

  const labelStyle: React.CSSProperties = {
    fontFamily:    'var(--font-mono, monospace)',
    fontSize:      10,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color:         `${gold}0.6)`,
    display:       'block',
    marginBottom:  6,
  };

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    background:   'rgba(255,255,255,0.04)',
    border:       `1px solid ${gold}0.22)`,
    borderRadius: 8,
    padding:      '10px 14px',
    color:        `${cream}0.9)`,
    fontSize:     14,
    fontFamily:   'inherit',
    outline:      'none',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  if (saved) {
    return (
      <div className="text-center py-6 flex flex-col gap-4">
        <span style={{ fontSize: 40 }}>{status === 'attending' ? '🎉' : '💌'}</span>
        <p className="font-serif" style={{ fontSize: 22, color: `${cream}0.9)` }}>
          {status === 'attending' ? "We can't wait to celebrate with you!" : "We'll miss you there."}
        </p>
        <p className="font-mono text-xs" style={{ color: `${gold}0.55)` }}>
          {email.trim()
            ? `A confirmation has been sent to ${email.trim()}.`
            : status === 'attending'
              ? 'Your RSVP has been recorded. See you soon!'
              : 'Your response has been recorded.'}
        </p>
        <button
          onClick={() => setSaved(false)}
          className="mt-4 font-mono uppercase tracking-widest rounded-full px-5 py-2 text-xs transition-all"
          style={{ border: `1px solid ${gold}0.3)`, color: `${gold}0.7)` }}
        >
          Edit response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <p style={{ ...labelStyle, marginBottom: 12 }}>
          Hi {guest.name} — will you be joining us?
        </p>

        <div className="flex gap-3">
          {(['attending', 'declined'] as RsvpStatus[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className="flex-1 rounded-xl py-3 font-mono uppercase tracking-widest text-xs transition-all duration-200"
              style={{
                border:     `1px solid ${gold}${status === s ? '0.6)' : '0.22)'})`,
                background: status === s
                  ? s === 'attending' ? `${gold}0.16)` : 'rgba(180,60,60,0.12)'
                  : 'transparent',
                color: status === s
                  ? s === 'attending' ? `${gold}1)` : 'rgba(220,100,100,0.9)'
                  : `${gold}0.5)`,
              }}
            >
              {s === 'attending' ? '✓ Attending' : '✗ Declining'}
            </button>
          ))}
        </div>
      </div>

      {/* Guest dietary */}
      {isAttending && (
        <div className="flex flex-col gap-4">
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

      {/* Plus one */}
      {showPlusOne && (
        <div
          className="rounded-xl p-4 flex flex-col gap-4"
          style={{ border: `1px solid ${gold}0.15)`, background: `${gold}0.04)` }}
        >
          <p style={labelStyle}>Will you be bringing a plus one?</p>

          <div className="flex gap-3">
            {[true, false].map(v => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setPlusOneAttending(v)}
                className="flex-1 rounded-xl py-2.5 font-mono uppercase tracking-widest text-xs transition-all duration-200"
                style={{
                  border:     `1px solid ${gold}${plusOneAttending === v ? '0.6)' : '0.22)'})`,
                  background: plusOneAttending === v ? `${gold}0.14)` : 'transparent',
                  color:      plusOneAttending === v ? `${gold}1)` : `${gold}0.5)`,
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

      {/* Email — pre-filled if on record, always editable, optional */}
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
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: `${gold}0.4)`, marginTop: 4 }}>
            A confirmation will be sent here. Edit if needed.
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs font-mono" style={{ color: 'rgba(220,100,100,0.85)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full py-3 font-mono uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50"
        style={{
          background: `${gold}0.14)`,
          border:     `1px solid ${gold}0.45)`,
          color:      `${gold}0.95)`,
        }}
      >
        {saving ? 'Saving…' : 'Confirm RSVP'}
      </button>
    </form>
  );
}
