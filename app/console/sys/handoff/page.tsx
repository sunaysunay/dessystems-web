'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SY014Page() {
  const [notes, setNotes]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bop/access-audit?view=iam&range=90')
      .then(r => r.json())
      .then(d => {
        const handoffs = (d.rows ?? []).filter((r: any) => r.action === 'HANDOFF');
        setNotes(handoffs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <ScreenHeader title="Handoff Notes" description="SY014 — AI-generated session handoff notes stored in bop_change_log (action=HANDOFF)" />

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Handoff Notes (90d)</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : notes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Latest</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {loading ? '—' : notes.length > 0 ? fmt(notes[0].created_at) : 'No notes yet'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-500">No handoff notes found</p>
          <p className="mt-1 text-sm text-slate-400">
            Handoff notes are written to <code className="font-mono bg-slate-100 px-1 rounded">bop_change_log</code> with{' '}
            <code className="font-mono bg-slate-100 px-1 rounded">action = &apos;HANDOFF&apos;</code> by the des-agent post-commit hook.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n: any) => {
            const body: string = n.new_value?.body ?? n.new_value?.summary ?? JSON.stringify(n.new_value ?? '');
            const isOpen = expanded === n.id;
            return (
              <div key={n.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-slate-50"
                  onClick={() => setExpanded(isOpen ? null : n.id)}>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {n.new_value?.title ?? n.object_id ?? 'Session Handoff'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmt(n.created_at)} · {n.actor_email ?? 'system'}</p>
                  </div>
                  <span className="text-slate-300 text-lg mt-0.5">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans leading-relaxed">{body}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
