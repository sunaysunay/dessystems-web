'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { portalT } from '@/lib/portal/labels';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const linkedSlug = (search.get('c') || '').toLowerCase();
  const uiLocale = search.get('l') || 'nl';
  const t = portalT(uiLocale);

  // Personalized links carry ?c=<slug>; the public footer shortcut doesn't,
  // so the dossier code becomes a visible field there.
  const [slug, setSlug] = useState(linkedSlug);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Already signed in? Straight to the dashboard.
    fetch('/api/portal/auth').then(r => { if (r.ok) router.replace('/portal'); }).catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (data.ok) { router.replace('/portal'); return; }
      setError(
        data.error === 'too_many' ? t('tooMany')
        : data.error === 'expired' ? t('expired')
        : t('wrongCode'),
      );
    } catch {
      setError(t('genericError'));
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-600" />
          <span className="text-sm font-bold tracking-wide text-gray-900">DES SYSTEMS</span>
          <span className="text-xs text-gray-400">· {t('portalTitle')}</span>
        </div>

        <h1 className="mb-2 text-xl font-semibold text-gray-900">{t('loginTitle')}</h1>
        <p className="mb-6 text-sm text-gray-500">{t('loginHint')}</p>

        {!linkedSlug && (
          <div className="mb-5">
            <label htmlFor="slug" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('dossierLabel')}
            </label>
            <input
              id="slug"
              type="text"
              autoComplete="off"
              maxLength={40}
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase())}
              placeholder="carisma"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-center font-mono text-base lowercase tracking-wide text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-gray-400">{t('dossierHint')}</p>
          </div>
        )}

        <label htmlFor="code" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('accessCode')}
        </label>
        <input
          id="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          maxLength={12}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="••••••••"
          autoFocus
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-center font-mono text-xl uppercase tracking-[0.25em] text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {error && <p className="mt-3 text-sm text-red-600" role="status" aria-live="polite">{error}</p>}

        <button
          type="submit"
          disabled={busy || !slug.trim()}
          className="mt-5 w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? t('busy') : t('open')}
        </button>

        <p className="mt-6 text-xs leading-relaxed text-gray-400">{t('loginHelp')}</p>
      </form>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-400">…</div>}>
      <LoginForm />
    </Suspense>
  );
}
