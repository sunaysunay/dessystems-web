'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { supabase, USING_MOCK } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await signIn(email, password);
    if (error) { setBusy(false); setErr(error); return; }
    // Fetch user language from profile and set locale cookie before navigating
    try {
      const { data: sd } = await supabase!.auth.getSession();
      const uid = sd?.session?.user?.id;
      const res = await fetch('/api/bop/user/me' + (uid ? '?uid=' + uid : ''));
      if (res.ok) {
        const profile = await res.json();
        if (profile.language) {
          document.cookie = 'bop_locale=' + profile.language + ';path=/;max-age=31536000;samesite=lax';
        }
        if (profile.role) {
          document.cookie = 'bop_role=' + profile.role + ';path=/;max-age=31536000;samesite=lax';
        }
      }
    } catch {}
    setBusy(false);
    router.push('/console');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={(e) => { void submit(e); }} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded bg-des-orange px-2 py-1 text-sm font-bold text-white">DES</span>
          <span className="text-lg font-bold tracking-wide text-slate-900">Business Operating Platform</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">dessystems.io console</p>
        {USING_MOCK && <p className="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Demo mode — any credentials work.</p>}

        {/* Email */}
        <label className="mt-5 block text-xs font-medium text-slate-600">Email</label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-des-blue focus:outline-none" />
        </div>

        {/* Password */}
        <label className="mt-4 block text-xs font-medium text-slate-600">Password</label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-10 text-sm focus:border-des-blue focus:outline-none" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
            {showPw ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" x2="23" y1="1" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {err && <p className="mt-3 text-xs text-rose-600">{err}</p>}

        <button type="submit" disabled={busy}
          className="mt-6 w-full rounded-lg bg-des-blue py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        {/* No access contact */}
        <p className="mt-5 text-center text-xs text-slate-400">
          No access?{' '}
          <a href="mailto:info@dessystems.io" className="text-des-blue hover:underline">
            info@dessystems.io
          </a>
        </p>
      </form>
    </div>
  );
}
