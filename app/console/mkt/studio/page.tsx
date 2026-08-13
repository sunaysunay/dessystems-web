'use client';
// app/console/mkt/studio/page.tsx — MK007 AI Vehicle Studio: session list

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

interface Session {
  id: string;
  status: string;
  preset_code: string;
  cost_cents: number;
  created_at: string;
  listing_id?: string;
  bop_studio_images?: { count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft:      'bg-slate-100 text-slate-600',
  processing: 'bg-blue-100 text-blue-700 animate-pulse',
  review:     'bg-amber-100 text-amber-700',
  completed:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  cancelled:  'bg-slate-100 text-slate-400',
};

export default function StudioListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'delete' | 'reset' } | null>(null);

  const load = () => {
    setLoading(true);
    void fetch('/api/bop/mkt/studio/sessions')
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/bop/mkt/studio/sessions/${id}`, { method: 'DELETE' });
    load();
    setDeleting(null);
  };

  const handleReset = async (id: string) => {
    setResetting(id);
    await fetch(`/api/bop/mkt/studio/sessions/${id}/reset`, { method: 'POST' });
    load();
    setResetting(null);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">AI Vehicle Studio</h1>
          <p className="text-sm text-slate-500 mt-0.5">Transform raw vehicle photos into marketplace-ready ads · <span className="text-slate-400">MK007</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/console/mkt/studio/preset-backgrounds" className="text-xs text-slate-500 hover:text-slate-700 underline">Preset Backgrounds</Link>
          <Link
            href="/console/mkt/studio/new"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Studio Session
          </Link>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-400">Loading sessions…</div>}

      {!loading && sessions.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📸</div>
          <p className="text-slate-600 font-medium">No sessions yet</p>
          <p className="text-sm text-slate-400 mt-1">Start a new session to transform vehicle photos</p>
          <Link href="/console/mkt/studio/new" className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            Create First Session
          </Link>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Session</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Preset</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Images</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cost</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-slate-700">{s.preset_code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.bop_studio_images?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono">€{(s.cost_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {new Date(s.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/console/mkt/studio/${s.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        Open →
                      </Link>
                      <button
                        onClick={() => setPendingAction({ id: s.id, action: 'reset' })}
                        disabled={resetting === s.id || s.status === 'processing'}
                        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Reset all steps and re-run pipeline"
                      >
                        {resetting === s.id ? 'Resetting…' : '↺ Re-run'}
                      </button>
                      <button
                        onClick={() => setPendingAction({ id: s.id, action: 'delete' })}
                        disabled={deleting === s.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
                        title="Delete session"
                      >
                        {deleting === s.id ? '…' : '✕'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingAction && (
        <ConfirmModal
          title={pendingAction.action === 'delete' ? 'Delete session' : 'Reset & re-run session'}
          message={pendingAction.action === 'delete'
            ? 'This will permanently remove the session and all its generated images. This action cannot be undone.'
            : 'All pipeline steps will be reset to pending and the session will be re-queued for processing.'}
          confirmLabel={pendingAction.action === 'delete' ? 'Delete' : 'Reset & Re-run'}
          danger={pendingAction.action === 'delete'}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            const { id, action } = pendingAction;
            setPendingAction(null);
            if (action === 'delete') void handleDelete(id);
            else void handleReset(id);
          }}
        />
      )}
    </div>
  );
}
