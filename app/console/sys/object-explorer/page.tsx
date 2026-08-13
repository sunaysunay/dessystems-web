'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import type { BopObject, BopDependency } from '@/lib/bop/types/objects';
import { OBJECT_TYPES } from '@/lib/bop/types/objects';

// ── Color maps ────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  screen:     'bg-blue-100 text-blue-700',
  api:        'bg-emerald-100 text-emerald-700',
  table:      'bg-amber-100 text-amber-700',
  component:  'bg-violet-100 text-violet-700',
  module:     'bg-slate-100 text-slate-600',
  workflow:   'bg-teal-100 text-teal-700',
  job:        'bg-orange-100 text-orange-700',
  permission: 'bg-red-100 text-red-600',
  setting:    'bg-pink-100 text-pink-700',
};

const DEP_COLOR: Record<string, string> = {
  calls:    'bg-blue-50 text-blue-600 border-blue-200',
  renders:  'bg-violet-50 text-violet-600 border-violet-200',
  reads:    'bg-emerald-50 text-emerald-600 border-emerald-200',
  writes:   'bg-amber-50 text-amber-600 border-amber-200',
  triggers: 'bg-orange-50 text-orange-600 border-orange-200',
  inherits: 'bg-slate-50 text-slate-500 border-slate-200',
  uses:     'bg-teal-50 text-teal-600 border-teal-200',
};

const STATUS_COLOR: Record<string, string> = {
  active:     'text-emerald-600',
  deprecated: 'text-slate-400',
  stub:       'text-amber-500',
  planned:    'text-blue-400',
};

// Protection level display config
const PROTECTION: Record<number, { label: string; badge: string; dot: string; text: string }> = {
  0: { label: 'SYSTEM LOCKED',       badge: 'bg-red-100 text-red-700 border border-red-200',         dot: 'bg-red-500',    text: 'No writes permitted at any level.' },
  1: { label: 'DELETE RESTRICTED',   badge: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-400', text: 'Deletion blocked. Archive via lifecycle transition.' },
  2: { label: 'UPDATE RESTRICTED',   badge: 'bg-amber-100 text-amber-700 border border-amber-200',    dot: 'bg-amber-400',  text: 'Updates require confirmation.' },
  3: { label: 'READ ONLY',           badge: 'bg-slate-100 text-slate-600 border border-slate-200',    dot: 'bg-slate-400',  text: 'Visible but not editable.' },
  4: { label: 'UNPROTECTED',         badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200', dot: 'bg-emerald-400', text: 'Standard object — no restrictions.' },
};

const CRITICALITY: Record<number, string> = {
  0: 'System Core',
  1: 'Core Business',
  2: 'Shared Component',
  3: 'Standard',
  4: 'Temporary',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type ProtectedObject = BopObject & {
  protection_lvl?: number;
  criticality?:    number;
  change_policy?:  string;
  lifecycle_state?: string;
};

type Gap = { object_id: string; type: string; path: string; reason: string };
type AuditResult = {
  status: 'clean' | 'gaps_found';
  gap_count: number;
  gaps: Gap[];
  scanned: { api_routes: number; page_files: number; bop_screens: number };
  registered: { objects: number };
  checked_at: string;
} | null;

// ── Confirm modal for delete ──────────────────────────────────────────────────
function DeleteModal({
  object, depCount, onConfirm, onCancel, busy,
}: {
  object: ProtectedObject;
  depCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [typed, setTyped] = useState('');
  const match = typed === object.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-bold text-slate-800">Delete object</h3>
        <p className="mt-1 text-sm text-slate-500">This action cannot be undone.</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Object ID</span><code className="font-mono">{object.object_id}</code>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Type</span><span className="font-medium">{object.type}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Incoming dependencies</span>
            <span className={depCount > 0 ? 'font-bold text-red-600' : 'text-slate-600'}>{depCount}</span>
          </div>
        </div>

        {depCount > 0 && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
            <strong>{depCount} object(s) depend on this.</strong> Deleting it will break those references.
            Remove the dependencies first using the "Used By" list.
          </div>
        )}

        <div className="mt-4">
          <p className="mb-1.5 text-xs text-slate-500">
            Type <strong className="text-slate-700">{object.name}</strong> to confirm:
          </p>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={object.name}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
          />
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!match || depCount > 0 || busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {busy ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>{label}</span>;
}

function ProtectionBadge({ lvl }: { lvl: number }) {
  const p = PROTECTION[lvl] ?? PROTECTION[4];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.badge}`}>
      {p.label}
    </span>
  );
}

function ActionButton({
  label, onClick, disabled, tooltip, variant = 'default',
}: {
  label: string; onClick?: () => void; disabled?: boolean; tooltip?: string; variant?: 'default' | 'danger';
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
          ${disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300' :
            variant === 'danger'
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-slate-200 text-slate-600 hover:border-slate-400'
          }`}>
        {label}
      </button>
      {disabled && tooltip && (
        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 w-52 rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-xl">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SY028Page() {
  const [objects, setObjects]     = useState<ProtectedObject[]>([]);
  const [deps, setDeps]           = useState<BopDependency[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<ProtectedObject | null>(null);
  const [moduleFilter, setModuleFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [q, setQ]                 = useState('');
  const [tab, setTab]             = useState<'explorer' | 'audit'>('explorer');
  const [audit, setAudit]         = useState<AuditResult>(null);
  const [auditing, setAuditing]   = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [toast, setToast]         = useState('');
  const [toastKind, setToastKind] = useState<'ok' | 'err'>('ok');
  const [deleteTarget, setDeleteTarget] = useState<ProtectedObject | null>(null);
  const [deleting, setDeleting]   = useState(false);

  function showToast(m: string, kind: 'ok' | 'err' = 'ok') {
    setToast(m); setToastKind(kind); setTimeout(() => setToast(''), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (moduleFilter) params.set('module', moduleFilter);
    if (typeFilter)   params.set('type', typeFilter);
    if (q)            params.set('q', q);
    const [od, dd] = await Promise.all([
      fetch('/api/bop/sys/objects?' + params).then(r => r.json()).catch(() => ({ objects: [] })),
      fetch('/api/bop/sys/dependencies').then(r => r.json()).catch(() => ({ dependencies: [] })),
    ]);
    setObjects(od.objects ?? []);
    setDeps(dd.dependencies ?? []);
    setLoading(false);
  }, [moduleFilter, typeFilter, q]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void runAudit(); }, []);

  const modules     = [...new Set(objects.map(o => o.module))].sort();
  const usesLinks   = selected ? deps.filter(d => d.from_id === selected.object_id) : [];
  const usedByLinks = selected ? deps.filter(d => d.to_id   === selected.object_id) : [];
  const objById     = (id: string) => objects.find(o => o.object_id === id);

  async function runAudit() {
    setAuditing(true);
    const d = await fetch('/api/bop/sys/objects/audit').then(r => r.json()).catch(() => null);
    setAudit(d); setAuditing(false);
  }

  async function runSeed() {
    setSeeding(true);
    const r = await fetch('/api/bop/sys/objects/seed', { method: 'POST' });
    const d = await r.json();
    if (r.ok) { showToast(`Seeded ${d.seeded.total_objects} objects`); void load(); void runAudit(); }
    else showToast('Seed error: ' + d.error, 'err');
    setSeeding(false);
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await fetch(`/api/bop/sys/objects?object_id=${encodeURIComponent(deleteTarget.object_id)}`, { method: 'DELETE' });
    const d = await r.json();
    if (r.ok) {
      showToast(`Deleted ${deleteTarget.object_id}`);
      setSelected(null);
      void load();
    } else {
      showToast(d.error ?? 'Delete failed', 'err');
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  const typeCounts = OBJECT_TYPES.reduce((acc, t) => {
    acc[t] = objects.filter(o => o.type === t).length;
    return acc;
  }, {} as Record<string, number>);

  const gapCount  = audit?.gap_count ?? 0;
  const selLvl    = selected?.protection_lvl ?? 4;
  const depCount  = usedByLinks.length;

  // Protection counts for stats bar
  const lockedCount     = objects.filter(o => (o.protection_lvl ?? 4) === 0).length;
  const restrictedCount = objects.filter(o => (o.protection_lvl ?? 4) > 0 && (o.protection_lvl ?? 4) < 4).length;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-xl ${toastKind === 'err' ? 'bg-red-600' : 'bg-slate-900'}`}>
          {toast}
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          object={deleteTarget}
          depCount={deps.filter(d => d.to_id === deleteTarget.object_id).length}
          onConfirm={() => { void executeDelete(); }}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}

      <ScreenHeader
        title="Object Explorer"
        description="SY028 — Business object registry, audit, and system protection framework."
      />

      {/* Tab bar */}
      <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-0">
        {(['explorer', 'audit'] as const).map(t => (
          <button key={t}
            onClick={() => { setTab(t); if (t === 'audit' && !audit) void runAudit(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2
              ${tab === t ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'audit' && gapCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{gapCount}</span>
            )}
            {t === 'audit' && gapCount === 0 && audit && (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">✓</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => { void runSeed(); }} disabled={seeding}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50">
            {seeding ? 'Seeding...' : 'Re-seed'}
          </button>
          <button onClick={() => { void runAudit(); }} disabled={auditing}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50">
            {auditing ? 'Scanning...' : 'Re-audit'}
          </button>
        </div>
      </div>

      {/* ── AUDIT TAB ─────────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div>
          {auditing && <div className="flex h-40 items-center justify-center text-sm text-slate-400">Scanning filesystem...</div>}
          {!auditing && audit && (
            <>
              <div className="mb-5 grid grid-cols-4 gap-4">
                {[
                  { label: 'API Routes Scanned', value: audit.scanned.api_routes },
                  { label: 'Page Files Scanned', value: audit.scanned.page_files },
                  { label: 'Registered Objects', value: audit.registered.objects },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{c.value}</p>
                  </div>
                ))}
                <div className={`rounded-xl border p-4 ${audit.gap_count === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Unregistered Gaps</p>
                  <p className={`mt-1 text-2xl font-bold ${audit.gap_count === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{audit.gap_count}</p>
                </div>
              </div>

              {audit.gap_count === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <p className="font-semibold text-emerald-700">All objects registered</p>
                  <p className="mt-1 text-xs text-emerald-500">Every route.ts and page.tsx on disk has a bop_objects entry.</p>
                  <p className="mt-3 text-[10px] text-slate-400">Last checked: {new Date(audit.checked_at).toLocaleString('nl-NL')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-3">
                    <p className="text-sm font-semibold text-red-700">{audit.gap_count} unregistered object{audit.gap_count !== 1 ? 's' : ''}</p>
                    <button onClick={() => { void runSeed(); }} disabled={seeding}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      {seeding ? 'Fixing...' : 'Fix — Re-seed'}
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Type</th>
                        <th className="px-5 py-3 text-left">Object ID</th>
                        <th className="px-5 py-3 text-left">Path</th>
                        <th className="px-5 py-3 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {audit.gaps.map((gap, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="px-5 py-3"><Badge label={gap.type} className={TYPE_COLOR[gap.type] ?? 'bg-slate-100 text-slate-500'} /></td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-700">{gap.object_id}</td>
                          <td className="px-5 py-3 font-mono text-[10px] text-slate-400 max-w-[180px] truncate">{gap.path}</td>
                          <td className="px-5 py-3 text-xs text-red-500">{gap.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
                    Checked {new Date(audit.checked_at).toLocaleString('nl-NL')} · Fix: add to <code>/lib/bop/manifests/index.ts</code> then Re-seed
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── EXPLORER TAB ──────────────────────────────────────────────────── */}
      {tab === 'explorer' && (
        <>
          {/* Stats bar — type tiles + protection summary */}
          <div className="mb-5 grid grid-cols-7 gap-3">
            {(['screen','api','table','component','module'] as const).map(t => (
              <div key={t}
                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={`rounded-xl border p-3 cursor-pointer transition-colors ${typeFilter === t ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t}s</p>
                <p className="mt-0.5 text-xl font-bold text-slate-800">{loading ? '—' : typeCounts[t] ?? 0}</p>
              </div>
            ))}
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-300">Locked</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{loading ? '—' : lockedCount}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Restricted</p>
              <p className="mt-0.5 text-xl font-bold text-orange-500">{loading ? '—' : restrictedCount}</p>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Object list */}
            <div className="w-[420px] flex-shrink-0">
              <div className="mb-3 flex flex-col gap-2">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search objects..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setModuleFilter('')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${!moduleFilter ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500'}`}>
                    All
                  </button>
                  {modules.map(m => (
                    <button key={m} onClick={() => setModuleFilter(m === moduleFilter ? '' : m)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${moduleFilter === m ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex h-20 items-center justify-center text-sm text-slate-400">Loading...</div>
                ) : objects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <p className="text-sm text-slate-400">No objects found</p>
                  </div>
                ) : objects.map(obj => {
                  const lvl = obj.protection_lvl ?? 4;
                  const p   = PROTECTION[lvl] ?? PROTECTION[4];
                  return (
                    <div key={obj.object_id} onClick={() => setSelected(obj)}
                      className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${selected?.object_id === obj.object_id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="flex items-center gap-2">
                        <Badge label={obj.type} className={TYPE_COLOR[obj.type] ?? 'bg-slate-100 text-slate-500'} />
                        <span className="text-sm font-medium text-slate-800 truncate">{obj.name}</span>
                        {/* Protection dot — only show for restricted objects */}
                        {lvl < 4 && (
                          <span className={`ml-auto h-2 w-2 rounded-full flex-shrink-0 ${p.dot}`} title={p.label} />
                        )}
                        <span className={`${lvl >= 4 ? 'ml-auto' : ''} text-[10px] font-semibold ${STATUS_COLOR[obj.status]}`}>{obj.status}</span>
                      </div>
                      <code className="mt-0.5 block text-[10px] text-slate-400 font-mono truncate">{obj.object_id}</code>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">{objects.length} objects</p>
            </div>

            {/* Detail panel */}
            {selected ? (
              <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-y-auto max-h-[calc(100vh-280px)]">

                {/* ── Object header ── */}
                <div className="border-b border-slate-100 p-6">
                  <div className="flex items-start gap-3">
                    <Badge label={selected.type} className={`${TYPE_COLOR[selected.type] ?? ''} text-sm px-3 py-1`} />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
                      <code className="text-xs font-mono text-slate-400">{selected.object_id}</code>
                    </div>
                    <span className={`text-xs font-semibold ${STATUS_COLOR[selected.status]}`}>{selected.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Module:</span> <span className="font-medium text-slate-700">{selected.module}</span></div>
                    {selected.route && <div><span className="text-slate-400">Route:</span> <code className="font-mono text-slate-600">{selected.route}</code></div>}
                    {selected.source_path && <div className="col-span-2"><span className="text-slate-400">Source:</span> <code className="font-mono text-slate-600">{selected.source_path}</code></div>}
                    {selected.description && <div className="col-span-2 italic text-slate-500">{selected.description}</div>}
                  </div>
                </div>

                {/* ── Protection panel ── */}
                <div className={`border-b px-6 py-4 ${selLvl === 0 ? 'bg-red-50 border-red-100' : selLvl <= 2 ? 'bg-orange-50 border-orange-100' : 'border-slate-100'}`}>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">System Protection</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <ProtectionBadge lvl={selLvl} />
                    {selected.criticality !== undefined && (
                      <span className="text-xs text-slate-500">
                        Criticality: <strong className="text-slate-700">{CRITICALITY[selected.criticality] ?? 'Standard'}</strong>
                      </span>
                    )}
                    {selected.change_policy && selected.change_policy !== 'none' && (
                      <span className="text-xs text-slate-500">
                        Policy: <strong className="text-slate-700">{selected.change_policy.replace(/_/g, ' ')}</strong>
                      </span>
                    )}
                  </div>
                  {selLvl < 4 && (
                    <p className="mt-2 text-[11px] text-slate-500">{PROTECTION[selLvl]?.text}</p>
                  )}

                  {/* Dependency count warning */}
                  {depCount > 0 && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                      <strong>{depCount} object{depCount !== 1 ? 's' : ''} depend on this.</strong> Remove all incoming dependencies before deleting.
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      disabled={selLvl < 4 || depCount > 0}
                      tooltip={
                        selLvl === 0 ? 'SYSTEM LOCKED — cannot be deleted' :
                        selLvl <= 1 ? 'DELETE RESTRICTED — archive via lifecycle first' :
                        selLvl <= 3 ? 'Protected — not eligible for deletion' :
                        depCount > 0 ? `${depCount} object(s) depend on this` : undefined
                      }
                      onClick={() => selLvl >= 4 && depCount === 0 && setDeleteTarget(selected)}
                    />
                    <ActionButton
                      label="Archive"
                      disabled={selLvl === 0}
                      tooltip={selLvl === 0 ? 'SYSTEM LOCKED — cannot be archived' : undefined}
                    />
                    <ActionButton label="Clone" />
                    {selected.route && (
                      <ActionButton
                        label="Open route"
                        onClick={() => window.open(selected.route!, '_blank')}
                      />
                    )}
                  </div>
                </div>

                {/* ── Dependencies ── */}
                <div className="p-6 space-y-5">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Uses ({usesLinks.length})</p>
                    {usesLinks.length === 0 ? (
                      <p className="text-xs text-slate-300">No registered outgoing dependencies</p>
                    ) : (
                      <div className="space-y-1.5">
                        {usesLinks.map(dep => {
                          const target = objById(dep.to_id);
                          return (
                            <div key={dep.to_id + dep.dep_type}
                              onClick={() => target && setSelected(target)}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${target ? 'cursor-pointer hover:bg-slate-50' : ''} ${DEP_COLOR[dep.dep_type] ?? 'bg-slate-50 border-slate-200'}`}>
                              <span className="text-[10px] font-semibold uppercase">{dep.dep_type}</span>
                              <span className="text-xs font-medium truncate">{target?.name ?? dep.to_id}</span>
                              {target && <Badge label={target.type} className={`ml-auto ${TYPE_COLOR[target.type] ?? ''}`} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Used By ({usedByLinks.length})</p>
                    {usedByLinks.length === 0 ? (
                      <p className="text-xs text-slate-300">No registered incoming dependencies</p>
                    ) : (
                      <div className="space-y-1.5">
                        {usedByLinks.map(dep => {
                          const source = objById(dep.from_id);
                          return (
                            <div key={dep.from_id + dep.dep_type}
                              onClick={() => source && setSelected(source)}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${source ? 'cursor-pointer hover:bg-slate-50' : ''} ${DEP_COLOR[dep.dep_type] ?? 'bg-slate-50 border-slate-200'}`}>
                              {source && <Badge label={source.type} className={TYPE_COLOR[source.type] ?? ''} />}
                              <span className="text-xs font-medium truncate">{source?.name ?? dep.from_id}</span>
                              <span className="ml-auto text-[10px] font-semibold uppercase">{dep.dep_type}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Select an object</p>
                  <p className="mt-1 text-xs text-slate-300">to view protection status and dependencies</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
