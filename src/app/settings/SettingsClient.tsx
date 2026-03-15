'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import FaqEditor from '@/components/faq/FaqEditor';
import ChangelogSection from '@/components/memory/ChangelogSection';
import type { CoupleProfile } from '@/lib/couple';

interface Props {
  profile:  CoupleProfile;
  shareUrl: string;
  coupleId: string;
}

export default function SettingsClient({ profile, shareUrl, coupleId }: Props) {
  const router = useRouter();

  // Profile form state
  const [name,      setName]      = useState(profile.name);
  const [startDate, setStartDate] = useState(profile.start_date ?? '');
  const [bio,       setBio]       = useState(profile.bio ?? '');
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');

  // Invite state
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
    if (res.ok) { router.refresh(); }
  }

  async function handleGenerateInvite() {
    setGenerating(true);
    const res = await fetch('/api/invites', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    setGenerating(false);
    if (res.ok) setInviteLink(body.inviteUrl);
  }

  async function handleCopyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-cream py-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-sans text-[11px] tracking-[0.4em] uppercase mb-1"
              style={{ color: '#C9964A' }}>✦ Settings</p>
            <h1 className="font-serif text-3xl text-ink">Your space</h1>
          </div>
          <Link href="/" className="btn-ghost text-sm">← Back</Link>
        </div>

        {/* ── Profile ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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

        {/* ── Share link ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-2">Your shareable link</h2>
          <p className="font-sans text-sm text-ink-light mb-4">
            Anyone with this link can view your space — no account needed.
          </p>

          <div className="flex gap-2 mb-1">
            <input readOnly className="form-input flex-1 text-xs font-mono" value={shareUrl} />
            <button className="btn-primary shrink-0" onClick={() => handleCopyLink(shareUrl)}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </section>

        {/* ── Invite partner ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-2">Invite your partner</h2>
          <p className="font-sans text-sm text-ink-light mb-5">
            Generate a one-time invite link and share it with your partner. They'll create an account and be joined to your space automatically.
          </p>

          {inviteLink ? (
            <div>
              <div className="flex gap-2 mb-3">
                <input readOnly className="form-input flex-1 text-xs font-mono" value={inviteLink} />
                <button className="btn-primary shrink-0" onClick={() => handleCopyLink(inviteLink)}>
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

        {/* ── FAQ editor ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-2">Wedding FAQs</h2>
          <p className="font-sans text-sm text-ink-light mb-5">
            These appear on your public FAQ page. Guests can read them — only you can edit them.
          </p>
          <FaqEditor coupleId={coupleId} />
        </section>

        {/* ── Edit history ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-serif text-xl text-ink mb-2">Edit history</h2>
          <p className="font-sans text-sm text-ink-light mb-5">
            A log of all changes made to your memories.
          </p>
          <ChangelogSection coupleId={coupleId} />
        </section>

        {/* ── Sign out ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-serif text-xl text-ink mb-2">Account</h2>
          <p className="font-sans text-sm text-ink-light mb-4">
            Sign out from this device. Your space and memories will still be here when you return.
          </p>
          <LogoutButton variant="section" />
        </section>

      </div>
    </div>
  );
}
