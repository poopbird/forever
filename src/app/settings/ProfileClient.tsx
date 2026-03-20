'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CoupleProfile } from '@/lib/couple';
import MemoriesAlbumsSection from '@/components/album/MemoriesAlbumsSection';
import HighlightsPickerSection from '@/components/highlights/HighlightsPickerSection';

interface Props {
  profile:  CoupleProfile;
  shareUrl: string;
  coupleId: string;
  siteUrl:  string;
}

export default function ProfileClient({ profile, shareUrl, coupleId }: Props) {
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

  const [inviteLink, setInviteLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied,     setCopied]     = useState(false);

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
