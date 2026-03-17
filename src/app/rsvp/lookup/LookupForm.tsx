'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GuestResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  token: string;
  rsvp_status: string;
}

export default function LookupForm({ coupleId }: { coupleId: string }) {
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [results, setResults] = useState<GuestResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const router = useRouter();

  const gold  = 'rgba(201,150,74,';
  const cream = 'rgba(232,213,176,';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${gold}0.22)`,
    borderRadius: 8,
    padding: '10px 14px',
    color: `${cream}0.9)`,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: `${gold}0.6)`,
    display: 'block',
    marginBottom: 6,
  };

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);

    const params = new URLSearchParams({ couple_id: coupleId });
    if (email.trim()) params.set('email', email.trim());
    if (phone.trim()) params.set('phone', phone.trim());

    const res = await fetch(`/api/rsvp/lookup?${params.toString()}`);

    setLoading(false);

    if (!res.ok) {
      setError('Search failed. Please try again.');
      return;
    }

    const data: GuestResult[] = await res.json();
    setResults(data);
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-5">
      <div>
        <label style={labelStyle}>Your email address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="jane@example.com"
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: `${gold}0.15)` }} />
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: `${gold}0.4)`, textTransform: 'uppercase', letterSpacing: '0.2em' }}>or</span>
        <div style={{ flex: 1, height: 1, background: `${gold}0.15)` }} />
      </div>

      <div>
        <label style={labelStyle}>Your phone number</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+65 9123 4567"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading || (!email.trim() && !phone.trim())}
        className="w-full rounded-full py-3 font-mono uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50"
        style={{
          background: `${gold}0.12)`,
          border:     `1px solid ${gold}0.4)`,
          color:      `${gold}0.9)`,
        }}
      >
        {loading ? 'Searching…' : 'Find my invitation'}
      </button>

      {error && (
        <p className="text-xs font-mono text-center" style={{ color: 'rgba(220,100,100,0.8)' }}>
          {error}
        </p>
      )}

      {results !== null && (
        <div className="flex flex-col gap-3 mt-2">
          {results.length === 0 ? (
            <p className="text-xs font-mono text-center" style={{ color: `${gold}0.5)` }}>
              No invitation found. Please check your email or phone number and try again,
              or contact the couple directly.
            </p>
          ) : (
            <>
              <p className="text-xs font-mono" style={{ color: `${gold}0.5)` }}>
                {results.length} guest{results.length > 1 ? 's' : ''} found:
              </p>
              {results.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => router.push(`/rsvp/${g.token}`)}
                  className="w-full rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: `${gold}0.07)`,
                    border:     `1px solid ${gold}0.25)`,
                  }}
                >
                  <p
                    className="font-serif"
                    style={{ fontSize: 16, color: `${cream}0.88)` }}
                  >
                    {g.name}
                  </p>
                  {g.email && (
                    <p className="font-mono text-xs mt-0.5" style={{ color: `${gold}0.5)` }}>
                      {g.email}
                    </p>
                  )}
                  <p
                    className="font-mono text-xs mt-1 uppercase tracking-widest"
                    style={{
                      color: g.rsvp_status === 'pending'
                        ? `${gold}0.6)` : g.rsvp_status === 'attending'
                        ? 'rgba(100,200,120,0.8)' : 'rgba(200,100,100,0.7)',
                    }}
                  >
                    {g.rsvp_status === 'pending' ? '· Awaiting response' :
                     g.rsvp_status === 'attending' ? '· Attending' : '· Declined'}
                  </p>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </form>
  );
}
