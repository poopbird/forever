'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9086c1.7018-1.5668 2.6836-3.874 2.6836-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9086-2.2581c-.8055.54-1.8350.859-3.0477.859-2.3446 0-4.3282-1.5836-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71C3.7841 10.17 3.6818 9.5932 3.6818 9s.1023-1.17.2823-1.71V4.9582H.9574C.3477 6.1731 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.891 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1632 6.6554 3.5795 9 3.5795Z" fill="#EA4335"/>
    </svg>
  );
}

export default function InvitePage() {
  const router  = useRouter();
  const { token } = useParams<{ token: string }>();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);

    // 1 — Create the Supabase auth user
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Sign-up failed.');
      setLoading(false);
      return;
    }

    // 2 — Accept the invite (links this new user to the existing couple)
    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Could not accept invite. The link may have expired.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    // Pass invite token through the OAuth redirect so the callback can accept it
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invite_token=${encodeURIComponent(token)}`,
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1A0A12 0%, #3D1228 50%, #1A1020 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="font-sans text-[11px] tracking-[0.4em] uppercase mb-3"
            style={{ color: 'rgba(232,201,123,0.7)' }}>✦ &nbsp; Forever &nbsp; ✦</p>
          <h1 className="font-serif text-4xl text-white mb-2">You're invited</h1>
          <p className="font-sans text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Create your account to join your partner's space
          </p>
        </div>

        <div className="bg-cream rounded-3xl p-8 shadow-2xl">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl
                       border border-ink/20 bg-white hover:bg-gray-50 font-sans text-sm
                       text-ink font-medium transition-colors duration-150 mb-6"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-ink/10" />
            <span className="font-sans text-xs text-ink-light">or sign up with email</span>
            <div className="flex-1 h-px bg-ink/10" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="form-label block mb-1.5">Your email</label>
              <input type="email" required className="form-input" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="form-label block mb-1.5">Choose a password</label>
              <input type="password" required className="form-input" placeholder="Min. 8 characters"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="form-label block mb-1.5">Confirm password</label>
              <input type="password" required className="form-input" placeholder="••••••••"
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>

            {error && <p className="text-sm font-sans text-rose-deep text-center">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading ? 'Joining…' : 'Join the space'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
