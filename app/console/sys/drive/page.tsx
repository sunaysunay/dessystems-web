'use client';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Account {
  id: string; tenant_key: string; display_name: string; google_email: string | null;
  root_folder_id: string | null; status: string; has_token: boolean;
  quota_used_bytes: number | null; quota_limit_bytes: number | null; last_error: string | null;
}
interface Entry {
  id: string; name: string; mimeType: string; size: number | null;
  webViewLink: string | null; modifiedTime: string | null; isFolder: boolean;
}

function fmtBytes(n: number | null) {
  if (n == null) return '—';
  if (n > 1e9) return (n / 1e9).toFixed(1) + ' GB';
  if (n > 1e6) return (n / 1e6).toFixed(1) + ' MB';
  if (n > 1e3) return (n / 1e3).toFixed(0) + ' KB';
  return n + ' B';
}

export default function ST001Page() {
  const t = useTranslations('st');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tenant, setTenant] = useState<string>('');
  const [files, setFiles] = useState<Entry[]>([]);
  const [crumbs, setCrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'BOP' }]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function loadAccounts() {
    fetch('/api/bop/st/accounts')
      .then(r => r.json())
      .then(d => {
        setAccounts(d.accounts ?? []);
        if (!tenant && d.accounts?.length) {
          const first = d.accounts.find((a: Account) => a.status === 'connected') ?? d.accounts[0];
          setTenant(first.tenant_key);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function loadFiles(tk: string, folderId: string | null) {
    setBusy(true); setError(null);
    const url = '/api/bop/st/files?tenant=' + tk + (folderId ? '&folder=' + folderId : '');
    fetch(url).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); setFiles([]); }
      else setFiles(d.files ?? []);
      setBusy(false);
    }).catch(e => { setError(String(e)); setBusy(false); });
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => {
    const acct = accounts.find(a => a.tenant_key === tenant);
    setCrumbs([{ id: null, name: 'BOP' }]);
    if (tenant && acct?.status === 'connected') loadFiles(tenant, null);
    else setFiles([]);
  }, [tenant, accounts.length]);

  const acct = accounts.find(a => a.tenant_key === tenant);
  const connected = acct?.status === 'connected';
  const quotaPct = acct?.quota_used_bytes && acct?.quota_limit_bytes
    ? Math.round((acct.quota_used_bytes / acct.quota_limit_bytes) * 100) : null;

  function openFolder(f: Entry) {
    setCrumbs(c => [...c, { id: f.id, name: f.name }]);
    loadFiles(tenant, f.id);
  }
  function goCrumb(i: number) {
    const c = crumbs[i];
    setCrumbs(crumbs.slice(0, i + 1));
    loadFiles(tenant, c.id);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !tenant) return;
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append('tenant', tenant);
    fd.append('file', f);
    const folder = crumbs[crumbs.length - 1].id;
    if (folder) fd.append('folder', folder);
    const res = await fetch('/api/bop/st/files', { method: 'POST', body: fd });
    const d = await res.json();
    if (d.error) setError(d.error);
    loadFiles(tenant, folder);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function onTrash(f: Entry) {
    if (!confirm(t('deleteConfirm'))) return;
    setBusy(true);
    await fetch('/api/bop/st/files/' + f.id + '?tenant=' + tenant, { method: 'DELETE' });
    loadFiles(tenant, crumbs[crumbs.length - 1].id);
  }

  return (
    <div>
      <ScreenHeader title={t('title')} description={t('description')} />

      {/* Tenant tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {accounts.map(a => (
          <button key={a.tenant_key} onClick={() => setTenant(a.tenant_key)}
            className={'rounded-lg px-4 py-2 text-sm font-medium border transition ' +
              (a.tenant_key === tenant
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
            {a.display_name}
            <span className={'ml-2 inline-block h-2 w-2 rounded-full ' +
              (a.status === 'connected' ? 'bg-emerald-500' : a.status === 'error' ? 'bg-red-500' : 'bg-slate-300')} />
          </button>
        ))}
      </div>

      {/* Connection card */}
      {acct && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">{acct.display_name}</p>
              <p className="text-xs text-slate-400">
                {loading ? '…' : connected ? (acct.google_email ?? t('connected')) : t('notConnected')}
              </p>
              {acct.last_error && <p className="mt-1 text-xs text-red-500">{acct.last_error}</p>}
            </div>
            <div className="flex items-center gap-3">
              {connected && quotaPct != null && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {fmtBytes(acct.quota_used_bytes)} / {fmtBytes(acct.quota_limit_bytes)}
                  </p>
                  <div className="mt-1 h-1.5 w-36 rounded-full bg-slate-100">
                    <div className={'h-1.5 rounded-full ' + (quotaPct > 90 ? 'bg-red-500' : quotaPct > 70 ? 'bg-amber-400' : 'bg-emerald-500')}
                      style={{ width: Math.min(quotaPct, 100) + '%' }} />
                  </div>
                </div>
              )}
              {connected ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{t('connected')}</span>
              ) : (
                <a href={'/api/bop/st/oauth/start?tenant=' + acct.tenant_key}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  {t('connect')}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File browser */}
      {connected && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {crumbs.map((c, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1 text-slate-300">/</span>}
                  <button onClick={() => goCrumb(i)} className="hover:text-slate-800 font-medium">{c.name}</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => loadFiles(tenant, crumbs[crumbs.length - 1].id)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800">{t('refresh')}</button>
              <label className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700">
                {t('upload')}
                <input ref={fileInput} type="file" className="hidden" onChange={onUpload} />
              </label>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2.5 text-left">{t('name')}</th>
                <th className="px-5 py-2.5 text-left">{t('size')}</th>
                <th className="px-5 py-2.5 text-left">{t('modified')}</th>
                <th className="px-5 py-2.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {busy && <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">…</td></tr>}
              {!busy && files.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">{t('noFiles')}</td></tr>
              )}
              {!busy && files.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {f.isFolder ? (
                      <button onClick={() => openFolder(f)} className="flex items-center gap-2 hover:text-blue-600">
                        <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                        </svg>
                        {f.name}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h4l6 6v8a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                        </svg>
                        {f.name}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{f.isFolder ? '—' : fmtBytes(f.size)}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{f.modifiedTime?.slice(0, 10) ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {!f.isFolder && (
                      <span className="flex justify-end gap-3 text-[11px] font-medium">
                        {f.webViewLink && (
                          <a href={f.webViewLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">{t('open')}</a>
                        )}
                        <a href={'/api/bop/st/files/' + f.id + '/download?tenant=' + tenant} className="text-slate-500 hover:text-slate-800">{t('download')}</a>
                        <button onClick={() => onTrash(f)} className="text-red-400 hover:text-red-600">{t('trash')}</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Setup documentation */}
      <details className="mt-6 rounded-xl border border-slate-200 bg-white" open={!accounts.some(a => a.status === 'connected')}>
        <summary className="cursor-pointer select-none px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600">
          {t('setup')}
        </summary>
        <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 space-y-4">
          <div>
            <p className="font-semibold text-slate-800 mb-1">1. Google Cloud OAuth app (one-time)</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Google Cloud Console → create/select a project (e.g. <code className="rounded bg-slate-100 px-1 font-mono">des-bop-storage</code>) → enable the <b>Google Drive API</b>.</li>
              <li>OAuth consent screen: type <b>External</b>, publishing status <b>In production</b> — <span className="text-red-500">Testing status expires refresh tokens after 7 days and silently disconnects all tenants.</span></li>
              <li>Credentials → Create OAuth client → type <b>Web application</b>. Authorized redirect URIs:
                <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-500">
                  <div>https://bop-dev.dessystems.io/api/bop/st/oauth/callback</div>
                  <div>https://bop.dessystems.io/api/bop/st/oauth/callback</div>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-1">2. Server configuration</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Set <code className="rounded bg-slate-100 px-1 font-mono">ST_GOOGLE_CLIENT_ID</code> and <code className="rounded bg-slate-100 px-1 font-mono">ST_GOOGLE_CLIENT_SECRET</code> in <code className="rounded bg-slate-100 px-1 font-mono">.env.local</code> (dev + prod), then restart the console process.</li>
              <li>Refresh tokens are stored server-side in <code className="rounded bg-slate-100 px-1 font-mono">st_drive_accounts</code> (RLS-protected, service-role only). Files BOP manages are indexed in <code className="rounded bg-slate-100 px-1 font-mono">st_files</code>.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-1">3. Connect each tenant</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>In the browser, log into the tenant&apos;s Google account (campers / mobil / shop / …), then click <b>Connect</b> on its tab above and approve the consent screen.</li>
              <li>On success a <code className="rounded bg-slate-100 px-1 font-mono">BOP</code> root folder is created in that Drive, quota is measured, and the file browser activates.</li>
              <li>Trashed files stay recoverable in Drive&apos;s own trash for 30 days. Each free Gmail account includes 15&nbsp;GB shared storage — the quota bar above warns at 70% (amber) and 90% (red).</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
