'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = ['Name your space', 'Start date', 'Your story'] as const;

export default function SetupPage() {
  const router = useRouter();
  const [step,      setStep]      = useState(0);
  const [name,      setName]      = useState('');
  const [startDate, setStartDate] = useState('');
  const [bio,       setBio]       = useState('');
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  async function handleFinish() {
    if (!name.trim()) { setError('Please enter a name for your space.'); return; }
    setSaving(true);
    setError('');

    // Ensure a couple row exists (POST is idempotent — safe to call even if already created)
    const postRes = await fetch('/api/couples', { method: 'POST' });
    if (!postRes.ok) {
      const body = await postRes.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong. Please try again.');
      setSaving(false);
      return;
    }

    // Now update with the user-entered details
    const res = await fetch('/api/couples', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        start_date: startDate || null,
        bio: bio.trim() || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong. Please try again.');
      setSaving(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1A0A12 0%, #3D1228 50%, #1A1020 100%)' }}
    >
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-8">
          <p className="font-sans text-[11px] tracking-[0.4em] uppercase mb-3"
            style={{ color: 'rgba(232,201,123,0.7)' }}>✦ &nbsp; Forever &nbsp; ✦</p>
          <h1 className="font-serif text-4xl text-white mb-2">Set up your space</h1>
          <p className="font-sans text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 32 : 8,
                background: i <= step ? '#C9964A' : 'rgba(255,255,255,0.2)',
              }} />
          ))}
        </div>

        <div className="bg-cream rounded-3xl p-8 shadow-2xl">

          {/* Step 0 — Name */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="form-label block mb-1.5">Couple name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Wengs & HY"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
                <p className="font-sans text-xs text-ink-light mt-1.5">
                  This appears on your hero page and shareable link.
                </p>
              </div>
              <button className="btn-primary" onClick={() => {
                if (!name.trim()) { setError('Please enter a name.'); return; }
                setError(''); setStep(1);
              }}>Continue →</button>
              {error && <p className="text-sm text-rose-deep text-center">{error}</p>}
            </div>
          )}

          {/* Step 1 — Start date */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="form-label block mb-1.5">Together since</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  autoFocus
                />
                <p className="font-sans text-xs text-ink-light mt-1.5">
                  Used for the "years together" counter. You can skip this.
                </p>
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setStep(0)}>← Back</button>
                <button className="btn-primary flex-1" onClick={() => setStep(2)}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 2 — Bio / tagline */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="form-label block mb-1.5">Your love story (optional)</label>
                <textarea
                  className="form-input resize-none"
                  rows={4}
                  placeholder="A beautiful journey, told one memory at a time."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  autoFocus
                />
                <p className="font-sans text-xs text-ink-light mt-1.5">
                  Shown as the tagline on your hero page.
                </p>
              </div>

              {error && <p className="text-sm text-rose-deep text-center">{error}</p>}

              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary flex-1" disabled={saving} onClick={handleFinish}>
                  {saving ? 'Saving…' : 'Finish setup ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
