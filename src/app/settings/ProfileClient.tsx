'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CoupleProfile, InvitationTheme } from '@/lib/couple';
import { CARD_THEMES } from '@/components/highlights/PolaroidHighlights';
import { storageUrl } from '@/lib/storageUrl';
import MemoriesAlbumsSection from '@/components/album/MemoriesAlbumsSection';
import HighlightsPickerSection from '@/components/highlights/HighlightsPickerSection';

interface PhotoMemory { id: string; media_url: string; caption: string; }

interface Props {
  profile:       CoupleProfile;
  shareUrl:      string;
  coupleId:      string;
  siteUrl:       string;
  photoMemories: PhotoMemory[];   // memories with photos, sorted newest-first
}

export default function ProfileClient({ profile, shareUrl, coupleId, photoMemories }: Props) {
  const router = useRouter();

  const [name,          setName]          = useState(profile.name);
  const [startDate,     setStartDate]     = useState(profile.start_date ?? '');
  const [bio,           setBio]           = useState(profile.bio ?? '');
  const [saving,        setSaving]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState('');

  const [weddingDate,   setWeddingDate]   = useState(profile.wedding_date ?? '');
  const [weddingVenue,  setWeddingVenue]  = useState(profile.wedding_venue ?? '');
  const [weddingCity,   setWeddingCity]   = useState(profile.wedding_city ?? '');
  const [timeStart,     setTimeStart]     = useState(profile.wedding_time_start?.slice(0,5) ?? '');
  const [timeEnd,       setTimeEnd]       = useState(profile.wedding_time_end?.slice(0,5) ?? '');
  const [weddingSaving, setWeddingSaving] = useState(false);
  const [weddingMsg,    setWeddingMsg]    = useState('');

  const [inviteLink,       setInviteLink]       = useState('');
  const [generating,       setGenerating]       = useState(false);
  const [copied,           setCopied]           = useState(false);
  const [invitationTheme,    setInvitationTheme]    = useState<InvitationTheme>(profile.invitation_theme ?? 'polaroid_white');
  const [themeSaving,        setThemeSaving]        = useState(false);
  const [themeMsg,           setThemeMsg]           = useState('');
  const [invitationPhotoUrl, setInvitationPhotoUrl] = useState<string | null>(profile.invitation_photo_url ?? null);
  const [photoPickerOpen,    setPhotoPickerOpen]    = useState(false);
  const [photoSaving,        setPhotoSaving]        = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg('');
    const res = await fetch('/api/couples', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, start_date: startDate || null, bio: bio || null }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? '✓ Saved' : '✗ Save failed — try again');
    if (res.ok) router.refresh();
  }

  async function handleSaveWeddingDetails(e: React.FormEvent) {
    e.preventDefault();
    setWeddingSaving(true); setWeddingMsg('');
    const res = await fetch('/api/couples', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        wedding_date:        weddingDate  || null,
        wedding_venue:       weddingVenue || null,
        wedding_city:        weddingCity  || null,
        wedding_time_start:  timeStart    || null,
        wedding_time_end:    timeEnd      || null,
      }),
    });
    setWeddingSaving(false);
    setWeddingMsg(res.ok ? '✓ Saved' : '✗ Save failed — try again');
    if (res.ok) router.refresh();
  }

  async function handleSaveTheme(theme: InvitationTheme) {
    setInvitationTheme(theme);
    setThemeSaving(true); setThemeMsg('');
    const res = await fetch('/api/couples', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invitation_theme: theme }),
    });
    setThemeSaving(false);
    setThemeMsg(res.ok ? '✓ Saved' : '✗ Save failed — try again');
    if (res.ok) router.refresh();
  }

  async function handleSavePhoto(url: string | null) {
    setInvitationPhotoUrl(url);
    setPhotoSaving(true);
    await fetch('/api/couples', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invitation_photo_url: url }),
    });
    setPhotoSaving(false);
    router.refresh();
  }

  async function handleGenerateInvite() {
    setGenerating(true);
    const res  = await fetch('/api/invites', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    setGenerating(false);
    if (res.ok) setInviteLink(body.inviteUrl);
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Couple profile */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-5">Couple profile</h2>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <div>
            <label className="form-label block mb-1.5">Couple name</label>
            <input type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="form-label block mb-1.5">Together since</label>
            <input type="date" className="form-input" value={startDate}
              onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label block mb-1.5">Tagline / bio</label>
            <textarea className="form-input resize-none" rows={3} value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A beautiful journey, told one memory at a time." />
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saveMsg && (
              <span className="font-sans text-sm"
                style={{ color: saveMsg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Wedding details */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-5">Wedding details</h2>
        <form onSubmit={handleSaveWeddingDetails} className="flex flex-col gap-4">
          <div>
            <label className="form-label block mb-1.5">Wedding date</label>
            <input type="date" className="form-input" value={weddingDate}
              onChange={e => setWeddingDate(e.target.value)} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="form-label block mb-1.5">Ceremony start</label>
              <input type="time" className="form-input" value={timeStart}
                onChange={e => setTimeStart(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="form-label block mb-1.5">Ceremony end</label>
              <input type="time" className="form-input" value={timeEnd}
                onChange={e => setTimeEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label block mb-1.5">Venue</label>
            <input type="text" className="form-input" value={weddingVenue}
              onChange={e => setWeddingVenue(e.target.value)}
              placeholder="Conrad Hotel" />
          </div>
          <div>
            <label className="form-label block mb-1.5">City</label>
            <input type="text" className="form-input" value={weddingCity}
              onChange={e => setWeddingCity(e.target.value)}
              placeholder="Singapore" />
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={weddingSaving} className="btn-primary">
              {weddingSaving ? 'Saving…' : 'Save details'}
            </button>
            {weddingMsg && (
              <span className="font-sans text-sm"
                style={{ color: weddingMsg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
                {weddingMsg}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Invitation card theme */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-1">Invitation card style</h2>
        <p className="font-sans text-sm text-ink-light mb-5">
          Choose how your wedding invitation card looks when guests scroll through your highlights.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(CARD_THEMES) as InvitationTheme[]).map(key => {
            const t = CARD_THEMES[key];
            const active = invitationTheme === key;
            return (
              <button
                key={key}
                onClick={() => handleSaveTheme(key)}
                disabled={themeSaving}
                className="flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-left"
                style={{
                  borderColor: active ? '#7B1E3C' : 'transparent',
                  background:  active ? 'rgba(123,30,60,0.04)' : '#f8f5f2',
                  cursor:      themeSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {/* Mini polaroid preview — photo strip + footer */}
                <div style={{
                  width:         '100%',
                  aspectRatio:   '3/4',
                  display:       'flex',
                  flexDirection: 'column',
                  background:    t.frameBg,
                  borderRadius:  '2px',
                  boxShadow:     '0 2px 8px rgba(0,0,0,0.18)',
                  overflow:      'hidden',
                  padding:       '3px 3px 0',
                }}>
                  {/* Photo area */}
                  <div style={{ flex: 1, background: t.photoFallback, borderRadius: '1px' }} />
                  {/* Footer */}
                  <div style={{
                    background:    t.footerBg,
                    padding:       '4px 5px 7px',
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'center',
                    gap:           3,
                  }}>
                    <div style={{ width: '68%', height: 3, background: t.nameColor, borderRadius: 1, opacity: 0.65 }} />
                    <div style={{ width: '48%', height: 1.5, background: t.labelColor, borderRadius: 1, opacity: 0.45 }} />
                  </div>
                </div>
                <div>
                  <p className="font-sans text-xs font-semibold text-ink leading-tight">{t.label}</p>
                  <p className="font-sans text-[10px] text-ink-light leading-tight mt-0.5">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        {themeMsg && (
          <p className="font-sans text-sm mt-3" style={{ color: themeMsg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
            {themeMsg}
          </p>
        )}

        {/* ── Invitation photo picker ── */}
        <div className="mt-6 pt-6 border-t border-stone-100">
          <p className="font-sans text-sm font-semibold text-ink mb-1">Invitation photo</p>
          <p className="font-sans text-xs text-ink-light mb-4">
            Shown in the photo section of the invitation card. Defaults to your most recent memory.
          </p>
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
              {invitationPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storageUrl(invitationPhotoUrl, { width: 128, quality: 70 })}
                  alt="Invitation photo"
                  className="w-full h-full object-cover"
                />
              ) : photoMemories[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storageUrl(photoMemories[0].media_url, { width: 128, quality: 70 })}
                  alt="Most recent"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs text-center px-1">
                  No photos
                </div>
              )}
            </div>
            <div>
              <p className="font-sans text-xs text-ink mb-1">
                {invitationPhotoUrl
                  ? 'Custom photo selected'
                  : <span className="italic text-ink-light">Auto — most recent memory</span>
                }
                {photoSaving && <span className="text-ink-light ml-2">Saving…</span>}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPhotoPickerOpen(true)}
                  className="font-sans text-xs underline"
                  style={{ color: '#7B1E3C' }}
                >
                  Change
                </button>
                {invitationPhotoUrl && (
                  <button
                    onClick={() => handleSavePhoto(null)}
                    className="font-sans text-xs text-ink-light underline"
                  >
                    Reset to auto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Photo picker modal ── */}
        {photoPickerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={e => { if (e.target === e.currentTarget) setPhotoPickerOpen(false); }}
          >
            <div className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-ink">Choose invitation photo</h3>
                <button onClick={() => setPhotoPickerOpen(false)} className="text-ink-light text-xl leading-none">✕</button>
              </div>
              {/* Reset to auto */}
              <button
                onClick={() => { handleSavePhoto(null); setPhotoPickerOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-stone-300 font-sans text-xs text-ink-light mb-4 hover:bg-stone-50 transition-colors"
              >
                ↺ Use most recent memory photo automatically
              </button>
              {photoMemories.length === 0 ? (
                <p className="font-sans text-sm text-ink-light">No photos uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photoMemories.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { handleSavePhoto(m.media_url); setPhotoPickerOpen(false); }}
                      className="aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90"
                      style={{ borderColor: invitationPhotoUrl === m.media_url ? '#7B1E3C' : 'transparent' }}
                      title={m.caption || undefined}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storageUrl(m.media_url, { width: 200, quality: 60 })}
                        alt={m.caption || ''}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Wedding Highlights */}
      <HighlightsPickerSection />

      {/* Memories & Albums */}
      <MemoriesAlbumsSection coupleId={coupleId} />

      {/* Shareable link */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-2">Your shareable link</h2>
        <p className="font-sans text-sm text-ink-light mb-4">
          Anyone with this link can view your space — no account needed.
        </p>
        <div className="flex gap-2">
          <input readOnly className="form-input flex-1 text-xs font-mono" value={shareUrl} />
          <button className="btn-primary shrink-0" onClick={() => handleCopy(shareUrl)}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </section>

      {/* Invite partner */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl text-ink mb-2">Invite your partner</h2>
        <p className="font-sans text-sm text-ink-light mb-5">
          Generate a one-time invite link and share it with your partner. They&apos;ll create an account and be joined to your space automatically.
        </p>
        {inviteLink ? (
          <div>
            <div className="flex gap-2 mb-3">
              <input readOnly className="form-input flex-1 text-xs font-mono" value={inviteLink} />
              <button className="btn-primary shrink-0" onClick={() => handleCopy(inviteLink)}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-sans text-xs text-ink-light">
              This link can only be used once. Generate a new one if your partner needs another.
            </p>
          </div>
        ) : (
          <button className="btn-primary" disabled={generating} onClick={handleGenerateInvite}>
            {generating ? 'Generating…' : '✦ Generate invite link'}
          </button>
        )}
      </section>

    </div>
  );
}
