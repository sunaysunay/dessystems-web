'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const DRIVE_FOLDERS = [
  { name: 'DES Assets',        type: 'folder', items: 142, updated: '2026-06-26' },
  { name: 'Handoff Docs',      type: 'folder', items: 18,  updated: '2026-06-28' },
  { name: 'Invoice Backups',   type: 'folder', items: 234, updated: '2026-06-27' },
  { name: 'Contract Templates',type: 'folder', items: 7,   updated: '2026-05-30' },
  { name: 'Brand Assets',      type: 'folder', items: 56,  updated: '2026-04-12' },
];

export default function SY010Page() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/sys/settings?key=gdrive_connected')
      .then(r => r.json())
      .then(d => { setStatus(d.value); setLoading(false); })
      .catch(() => { setStatus(null); setLoading(false); });
  }, []);

  const connected = status === true || status === 'true';

  return (
    <div>
      <ScreenHeader title="Google Drive" description="SY010 — Connected Drive folders and document access for DES operations" />

      {/* Connection status card */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.28 3L1 12.5 6.28 22h11.44L23 12.5 17.72 3H6.28zM12 16.5l-5.5-9.5h11L12 16.5z"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Google Drive Integration</p>
              <p className="text-xs text-slate-400">
                {loading ? 'Checking connection...' : connected ? 'Connected — service account active' : 'Not connected'}
              </p>
            </div>
          </div>
          <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (loading ? 'bg-slate-100 text-slate-400' : connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
            {loading ? 'checking...' : connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {!loading && !connected && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            Google Drive is not connected. Set <code className="font-mono bg-amber-100 px-1 rounded">gdrive_connected = true</code> in System Settings (SY004) after configuring a service account.
          </div>
        )}
      </div>

      {/* Folders */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Configured Drive Folders</span>
          <a href="https://drive.google.com" target="_blank" rel="noreferrer"
            className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">
            Open Drive ↗
          </a>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-5 py-2.5 text-left">Folder</th>
              <th className="px-5 py-2.5 text-left">Items</th>
              <th className="px-5 py-2.5 text-left">Last Updated</th>
              <th className="px-5 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {DRIVE_FOLDERS.map(f => (
              <tr key={f.name} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                    </svg>
                    {f.name}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-500">{f.items}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{f.updated}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                    {connected ? 'synced' : 'offline'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-[11px] text-slate-400">
        Folder list is configured statically. Live sync requires service account credentials set in Google Cloud Console.
      </div>
    </div>
  );
}
