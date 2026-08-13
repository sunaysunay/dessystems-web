'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const IMAP_KEYS = ['imap_host','imap_port','imap_user','imap_ssl','imap_folder','imap_poll_interval','imap_last_uid'];

export default function SY017Page() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [form, setForm]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [testResult] = useState<string | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const d = await fetch('/api/bop/sys/settings').then(r => r.json());
    const map: Record<string, any> = {};
    for (const s of (d.settings ?? [])) map[s.key] = s.value;
    setSettings(map);
    const f: Record<string, string> = {};
    for (const k of IMAP_KEYS) f[k] = map[k] ?? '';
    setForm(f);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    setSaving(true);
    await Promise.all(
      IMAP_KEYS.map(k => fetch('/api/bop/sys/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k, value: form[k] ?? '' }),
      }))
    );
    setSaving(false);
    showToast('IMAP settings saved');
    void load();
  }

  const connected = !!settings['imap_host'];
  const lastUid   = settings['imap_last_uid'];

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="IMAP Config" description="SY017 — Inbound email connection settings for automated inbox processing" />

      {/* Status bar */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={'h-3 w-3 rounded-full ' + (connected ? 'bg-emerald-500' : 'bg-slate-300')} />
            <div>
              <p className="font-semibold text-slate-800">
                {connected ? (form['imap_user'] || form['imap_host']) : 'Not configured'}
              </p>
              <p className="text-xs text-slate-400">
                {connected ? `${form['imap_host']}:${form['imap_port'] || '993'} · folder: ${form['imap_folder'] || 'INBOX'}` : 'No IMAP host set'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUid && <span className="text-xs text-slate-400">Last UID: {lastUid}</span>}
            <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
              {connected ? 'Configured' : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Config form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Connection Settings</p>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              ['imap_host',          'IMAP Host',          'imap.gmail.com',  'text'],
              ['imap_port',          'Port',               '993',             'number'],
              ['imap_user',          'Email / Username',   'inbox@example.com','email'],
              ['imap_ssl',           'SSL/TLS',            'true',            'text'],
              ['imap_folder',        'Mailbox Folder',     'INBOX',           'text'],
              ['imap_poll_interval', 'Poll Interval (sec)','60',              'number'],
            ].map(([key, label, placeholder, type]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button onClick={() => { void save(); }} disabled={saving || loading}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {testResult && (
            <span className="self-center text-xs text-slate-500">{testResult}</span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
        IMAP credentials are stored in <code className="font-mono bg-amber-100 px-0.5 rounded">bop_settings</code>. Password/app-token must be set via the VPS environment variable <code className="font-mono bg-amber-100 px-0.5 rounded">IMAP_PASSWORD</code> — never store passwords here.
      </div>
    </div>
  );
}
