'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function fmt(s: string | null) { return s ? new Date(s).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

export function AccountSecurity() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase!.auth.getUser();
      const uid = data?.user?.id;
      if (uid) setInfo(await fetch(`/api/bop/user/security?uid=${uid}`).then(r => r.json()));
    } catch {}
    setLoading(false);
  }
  function toggle() { const n = !open; setOpen(n); if (n && !info) void load(); }

  const expSoon = info?.credential_expires_in_days !== null && info.credential_expires_in_days <= 14;

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} title="Account & security"
        className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        {expSoon && <span className="absolute -right-0 -top-0 h-2 w-2 rounded-full bg-amber-500" />}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="mb-3 text-sm font-bold text-slate-800">Account &amp; Security</p>
          {loading || !info ? <p className="text-sm text-slate-400">Loading…</p> : info.error ? <p className="text-sm text-red-500">{info.error}</p> : (
            <div className="space-y-2 text-sm">
              <Row k="Signed in as" v={info.email} />
              <Row k="Role" v={(info.role ?? '—').replace('_', ' ')} />
              <Row k="Auth provider" v={info.provider} />
              <Row k="Last sign-in" v={fmt(info.last_sign_in_at)} />
              <Row k="Account created" v={fmt(info.created_at)} />
              <Row k="Email confirmed" v={info.email_confirmed ? 'Yes' : 'No'} good={info.email_confirmed} bad={!info.email_confirmed} />
              <Row k="MFA" v={info.mfa ? 'Enabled' : 'Off'} good={info.mfa} />
              <div className="flex justify-between">
                <span className="text-slate-400">Credential expiry</span>
                <span className={`font-medium ${expSoon ? 'text-amber-600' : 'text-slate-700'}`}>
                  {info.credential_expires_in_days !== null ? `${info.credential_expires_in_days}d (of ${info.credential_expiry_advisory})` : '—'}
                </span>
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <Link href="/console/sys/sessions" onClick={() => setOpen(false)} className="text-xs font-medium text-blue-600 hover:underline">Active sessions</Link>
            <span className="text-slate-300">·</span>
            <Link href="/console/sys/access-audit" onClick={() => setOpen(false)} className="text-xs font-medium text-blue-600 hover:underline">Access audit</Link>
          </div>
        </div>
      )}
    </div>
  );
}
function Row({ k, v, good, bad }: { k: string; v: string; good?: boolean; bad?: boolean }) {
  return <div className="flex justify-between"><span className="text-slate-400">{k}</span><span className={`font-medium ${good ? 'text-emerald-600' : bad ? 'text-red-500' : 'text-slate-700'}`}>{v}</span></div>;
}

export function AccountSecurityPanel() {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase!.auth.getUser();
        const uid = data?.user?.id;
        if (uid) setInfo(await fetch(`/api/bop/user/security?uid=${uid}`).then(r => r.json()));
      } catch {}
    })();
  }, []);
  const expSoon = info?.credential_expires_in_days !== null && info.credential_expires_in_days <= 14;
  if (!info) return <p className="text-sm text-slate-400">Loading…</p>;
  if (info.error) return <p className="text-sm text-red-500">{info.error}</p>;
  return (
    <div className="space-y-2 text-sm">
      <Row k="Signed in as" v={info.email} />
      <Row k="Role" v={(info.role ?? '—').replace('_', ' ')} />
      <Row k="Auth provider" v={info.provider} />
      <Row k="Last sign-in" v={fmt(info.last_sign_in_at)} />
      <Row k="Account created" v={fmt(info.created_at)} />
      <Row k="Email confirmed" v={info.email_confirmed ? 'Yes' : 'No'} good={info.email_confirmed} bad={!info.email_confirmed} />
      <Row k="MFA" v={info.mfa ? 'Enabled' : 'Off'} good={info.mfa} />
      <div className="flex justify-between">
        <span className="text-slate-400">Credential expiry</span>
        <span className={`font-medium ${expSoon ? 'text-amber-600' : 'text-slate-700'}`}>{info.credential_expires_in_days !== null ? `${info.credential_expires_in_days}d (of ${info.credential_expiry_advisory})` : '—'}</span>
      </div>
      <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
        <Link href="/console/sys/sessions" className="text-xs font-medium text-blue-600 hover:underline">Active sessions</Link>
        <span className="text-slate-300">·</span>
        <Link href="/console/sys/access-audit" className="text-xs font-medium text-blue-600 hover:underline">Access audit</Link>
      </div>
    </div>
  );
}
