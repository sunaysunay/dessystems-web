'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Program {
  program_id: string; code: string; title: Record<string, string>;
  owner: string | null; status: string; target_date: string | null;
  total_phases: number; completed_phases: number;
  total_tasks: number; verified_tasks: number;
  total_deliverables: number; verified_deliverables: number; pct: number;
  status_note: string | null;
  scope: string | null;
}
interface Phase {
  phase_id: string; program_id: string; seq: number; title: Record<string, string>;
  status: string; fte_days: number | null; go_signal: string | null;
  total_tasks: number; verified_tasks: number;
  total_deliverables: number; verified_deliverables: number; pct: number;
  status_note: string | null;
}
interface Task {
  task_id: string; phase_id: string; title: Record<string, string>;
  task_type: string; blocked_reason: string | null;
  total_deliverables: number; verified_deliverables: number;
  derived_status: string; pct: number;
  op_task_id: string | null;
  discrepancy_note: string | null;
  tested: boolean;
  tested_at: string | null;
  tested_by: string | null;
}
interface OpTask {
  id: string; title: string; status: string; priority: string;
}
interface Deliverable {
  id: string; task_id: string; kind: string; ref: string;
  verify_mode: string; is_verified: boolean;
  verified_at: string | null; verify_error: string | null;
}
interface DocFile {
  name: string; path: string; size: number; mimetype: string; created_at: string;
}

const SC: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700', done: 'bg-blue-50 text-blue-700',
  test: 'bg-purple-50 text-purple-700', cancelled: 'bg-red-50 text-red-600', not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-50 text-blue-700', verified: 'bg-emerald-50 text-emerald-700',
  blocked: 'bg-red-50 text-red-600',
};
const TC: Record<string, string> = {
  screen: 'bg-violet-50 text-violet-700', api: 'bg-blue-50 text-blue-700',
  schema: 'bg-amber-50 text-amber-700', integration: 'bg-cyan-50 text-cyan-700',
  compliance: 'bg-red-50 text-red-600', infra: 'bg-slate-100 text-slate-600',
  docs: 'bg-emerald-50 text-emerald-700', general: 'bg-slate-100 text-slate-500',
};
const KC: Record<string, string> = {
  SCREEN: 'bg-violet-50 text-violet-700', MENU_NODE: 'bg-indigo-50 text-indigo-700',
  DB_TABLE: 'bg-amber-50 text-amber-700', RLS_POLICY: 'bg-red-50 text-red-600',
  API_ROUTE: 'bg-blue-50 text-blue-700', PERMISSION: 'bg-orange-50 text-orange-700',
  I18N_KEY: 'bg-emerald-50 text-emerald-700', HELP_DOC: 'bg-teal-50 text-teal-700',
  EMAIL_TEMPLATE: 'bg-pink-50 text-pink-700', TELEGRAM_ALERT: 'bg-sky-50 text-sky-700',
  TEST: 'bg-lime-50 text-lime-700', MIGRATION: 'bg-yellow-50 text-yellow-700',
  SMOKE_CHECK: 'bg-slate-100 text-slate-600', CUSTOM: 'bg-slate-100 text-slate-500',
};

const PROGRAM_STATUSES = ['draft', 'active', 'test', 'paused', 'done', 'cancelled'];
const PHASE_STATUSES = ['not_started', 'in_progress', 'done', 'blocked'];
const TASK_TYPES = ['screen', 'api', 'schema', 'integration', 'compliance', 'infra', 'docs', 'general'];
const DELIVERABLE_KINDS = ['SCREEN','MENU_NODE','DB_TABLE','RLS_POLICY','API_ROUTE','PERMISSION','I18N_KEY','HELP_DOC','EMAIL_TEMPLATE','TELEGRAM_ALERT','TEST','MIGRATION','SMOKE_CHECK','CUSTOM'];

function Bar({ pct, h = 'h-2' }: { pct: number; h?: string }) {
  const c = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-200';
  return <div className={`w-full ${h} rounded-full bg-slate-100 overflow-hidden`}><div className={`${h} rounded-full ${c} transition-all`} style={{ width: `${pct}%` }} /></div>;
}

function t(o: Record<string, string> | string | null | undefined): string {
  if (!o) return ''; if (typeof o === 'string') return o;
  return o.en || o.nl || o.de || Object.values(o)[0] || '';
}

const api = async (body: Record<string, unknown>) => {
  const r = await fetch('/api/bop/sys/impl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
};

function ChevRight({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-4"><span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>{children}</label>;
}

const ic = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
const bp = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const bs = "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50";

function OpTaskPicker({ onSelect, onCancel }: { onSelect: (id: string, title: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; status: string; priority: string; task_number?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (term: string) => {
    setSearching(true);
    const r = await api({ action: 'search_op_tasks', search: term });
    setResults(r.tasks ?? []);
    setSearching(false);
  }, []);

  useEffect(() => { doSearch(''); }, [doSearch]);

  const onInput = (val: string) => {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(val), 300);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <input className="rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 w-56 focus:border-orange-400 focus:outline-none"
          placeholder="Search OP001 tasks..." value={q} onChange={e => onInput(e.target.value)} autoFocus />
        <button onClick={onCancel} className="text-[10px] text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      <div className="absolute left-0 top-6 z-30 w-80 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
        {searching && <div className="px-3 py-2 text-[10px] text-slate-400">Searching...</div>}
        {!searching && results.length === 0 && <div className="px-3 py-2 text-[10px] text-slate-400">No tasks found</div>}
        {results.map(tk => (
          <button key={tk.id} onClick={() => onSelect(tk.id, tk.task_number ? `${tk.task_number} — ${tk.title}` : tk.title)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-orange-50 border-b border-slate-50 last:border-0">
            {tk.task_number && <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">{tk.task_number}</span>}
            <span className="text-[10px] text-slate-700 truncate flex-1">{tk.title}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${tk.status === 'done' ? 'bg-emerald-50 text-emerald-600' : tk.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{tk.status}</span>
            <span className="text-[8px] text-slate-400">{tk.priority}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OpGoalPicker({ onSelect, onCancel }: { onSelect: (id: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; goal_number: string; title: string; status: string; health: string; progress_pct: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    setSearching(true);
    const r = await api({ action: 'search_op_goals', search: term });
    setResults(r.goals ?? []);
    setSearching(false);
  }, []);

  useEffect(() => { doSearch(''); }, [doSearch]);

  const onInput = (val: string) => {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(val), 300);
  };

  const HC: Record<string, string> = { on_track: 'bg-emerald-50 text-emerald-600', at_risk: 'bg-amber-50 text-amber-600', off_track: 'bg-red-50 text-red-600' };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input className="rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 w-56 focus:border-purple-400 focus:outline-none"
          placeholder="Search OP002 goals..." value={q} onChange={e => onInput(e.target.value)} autoFocus />
        <button onClick={onCancel} className="text-[10px] text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      <div className="absolute left-0 top-6 z-30 w-80 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
        {searching && <div className="px-3 py-2 text-[10px] text-slate-400">Searching...</div>}
        {!searching && results.length === 0 && <div className="px-3 py-2 text-[10px] text-slate-400">No goals found</div>}
        {results.map(g => (
          <button key={g.id} onClick={() => onSelect(g.id)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-purple-50 border-b border-slate-50 last:border-0">
            <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">{g.goal_number}</span>
            <span className="text-[10px] text-slate-700 truncate flex-1">{g.title}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${HC[g.health] ?? 'bg-slate-100 text-slate-500'}`}>{g.health?.replace('_', ' ')}</span>
            <span className="text-[8px] text-slate-400">{g.progress_pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SY051Page() {
  const [tab, setTab] = useState<'dashboard' | 'tree'>('tree');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selProgramId, setSelProgramId] = useState<string>('');
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasksByPhase, setTasksByPhase] = useState<Record<string, Task[]>>({});
  const [delivsByTask, setDelivsByTask] = useState<Record<string, Deliverable[]>>({});
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState('');
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [docsTotalSize, setDocsTotalSize] = useState(0);
  const [docsMaxSize] = useState(10 * 1024 * 1024);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ path: string; name: string; mimetype: string } | null>(null);

  const [drawer, setDrawer] = useState<'program' | 'phase' | 'task' | 'deliverable' | null>(null);
  const [drawerCtx, setDrawerCtx] = useState<{ phaseId?: string; taskId?: string }>({});
  const [editProgram, setEditProgram] = useState({ code: '', title_en: '', owner: '', status: 'draft', total_fte_days: '', target_date: '' });
  const [editPhase, setEditPhase] = useState({ seq: '', title_en: '', fte_days: '', status: 'not_started', go_signal: '' });
  const [editTask, setEditTask] = useState({ seq: '', title_en: '', task_type: 'general', estimate_h: '', ref_spec_section: '', impl_notes: '' });
  const [editDeliv, setEditDeliv] = useState({ kind: 'SCREEN', ref: '', verify_mode: 'auto', sort_order: '0' });

  // OP001 link state (program-level)
  const [programOpTask, setProgramOpTask] = useState<OpTask | null>(null);
  const [linkingProgram, setLinkingProgram] = useState(false);

  // OP002 goal link state (program-level)
  const [programOpGoal, setProgramOpGoal] = useState<{ id: string; goal_number: string; title: string; status: string; health: string; progress_pct: number } | null>(null);
  const [linkingGoal, setLinkingGoal] = useState(false);

  // Status change state
  const [statusEdit, setStatusEdit] = useState<{ type: 'program' | 'phase'; id: string; current: string } | null>(null);
  const [statusNew, setStatusNew] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  // Scope state (program-level)
  const [scopeVal, setScopeVal] = useState('');
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeDirty, setScopeDirty] = useState(false);

  // Discrepancy note state (task-level)
  const [discEditId, setDiscEditId] = useState<string | null>(null);
  const [discVal, setDiscVal] = useState('');
  const [discSaving, setDiscSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/bop/sys/impl?scope=programs');
    const { programs: data } = await res.json();
    setPrograms(data ?? []);
    if (selProgramId) {
      const p = (data ?? []).find((pr: Program) => pr.program_id === selProgramId);
      if (p && !scopeDirty) setScopeVal(p.scope ?? '');
    }
    setLoading(false);
  }, [selProgramId, scopeDirty]);

  const loadFullTree = useCallback(async (programId: string) => {
    const pRes = await fetch(`/api/bop/sys/impl?scope=phases&program_id=${programId}`);
    const { phases: ph } = await pRes.json();
    setPhases(ph ?? []);
    const tbp: Record<string, Task[]> = {};
    for (const p of (ph ?? [])) {
      const tRes = await fetch(`/api/bop/sys/impl?scope=tasks&phase_id=${p.phase_id}`);
      const { tasks: tks } = await tRes.json();
      tbp[p.phase_id] = tks ?? [];
    }
    setTasksByPhase(tbp);
    setDelivsByTask({});
    // Fetch program-level OP001 task + OP002 goal
    const opRes = await api({ action: 'fetch_program_op_task', program_id: programId });
    setProgramOpTask(opRes.op_task ?? null);
    const goalRes = await api({ action: 'fetch_program_op_goal', program_id: programId });
    setProgramOpGoal(goalRes.op_goal ?? null);
  }, []);

  const loadDeliverables = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/bop/sys/impl?scope=deliverables&task_id=${taskId}`);
    const { deliverables: data } = await res.json();
    setDelivsByTask(prev => ({ ...prev, [taskId]: data ?? [] }));
  }, []);

  const loadDocs = useCallback(async (programId: string) => {
    const res = await fetch(`/api/bop/sys/impl/docs?program_id=${programId}`);
    const data = await res.json();
    setDocs(data.files ?? []);
    setDocsTotalSize(data.totalSize ?? 0);
  }, []);

  const uploadDoc = async (file: File, docType: 'ai_spec' | 'impl_plan' | 'user_manual' | 'test_scenario') => {
    if (!selProgramId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('program_id', selProgramId);
    fd.append('doc_type', docType);
    fd.append('file', file);
    const res = await fetch('/api/bop/sys/impl/docs', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.error) showToast(data.error);
    else { showToast('File uploaded'); loadDocs(selProgramId); }
    setUploading(false);
  };

  const deleteDoc = async (path: string) => {
    const res = await fetch('/api/bop/sys/impl/docs', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (data.error) showToast(data.error);
    else { showToast('File deleted'); if (selProgramId) loadDocs(selProgramId); }
  };

  const downloadDoc = (path: string, name: string) => {
    window.open(`/api/bop/sys/impl/docs/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`, '_blank');
  };

  useEffect(() => { loadPrograms(); }, [loadPrograms]);
  useEffect(() => {
    if (selProgramId) {
      loadFullTree(selProgramId); loadDocs(selProgramId);
      const p = programs.find(pr => pr.program_id === selProgramId);
      setScopeVal(p?.scope ?? '');
    }
  }, [selProgramId, loadFullTree, loadDocs]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePhase = (id: string) => {
    setExpandedPhases(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleTask = (id: string) => {
    if (!delivsByTask[id]) loadDeliverables(id);
    setExpandedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const expandAll = () => {
    setExpandedPhases(new Set(phases.map(p => p.phase_id)));
    const all = Object.values(tasksByPhase).flat();
    setExpandedTasks(new Set(all.map(t => t.task_id)));
    for (const tk of all) { if (!delivsByTask[tk.task_id]) loadDeliverables(tk.task_id); }
  };
  const collapseAll = () => { setExpandedPhases(new Set()); setExpandedTasks(new Set()); };

  const verifyTask = async (taskId: string) => {
    setVerifying(true);
    const res = await fetch('/api/bop/sys/impl/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: taskId }) });
    const { verified, total } = await res.json();
    showToast(`Verified: ${verified}/${total}`);
    loadDeliverables(taskId); loadFullTree(selProgramId); loadPrograms();
    setVerifying(false);
  };
  const verifyAll = async () => {
    if (!selProgramId) return;
    setVerifying(true);
    let tv = 0, tt = 0;
    for (const ph of phases) {
      for (const tk of (tasksByPhase[ph.phase_id] ?? [])) {
        const r = await fetch('/api/bop/sys/impl/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: tk.task_id }) });
        const { verified, total } = await r.json();
        tv += verified ?? 0; tt += total ?? 0;
      }
    }
    showToast(`Full verify: ${tv}/${tt}`);
    loadFullTree(selProgramId); loadPrograms();
    setVerifying(false);
  };

  const saveStatus = async () => {
    if (!statusEdit || !statusNew) return;
    setStatusSaving(true);
    const actionName = statusEdit.type === 'program' ? 'update_program_status' : 'update_phase_status';
    const idKey = statusEdit.type === 'program' ? 'program_id' : 'phase_id';
    const res = await api({ action: actionName, [idKey]: statusEdit.id, status: statusNew, status_note: statusNote });
    if (res.error) {
      showToast(res.error);
    } else {
      showToast(`Status updated to "${statusNew}"`);
      setStatusEdit(null); setStatusNew(''); setStatusNote('');
      loadPrograms(); if (selProgramId) loadFullTree(selProgramId);
    }
    setStatusSaving(false);
  };

  const saveScope = async () => {
    if (!selProgramId) return;
    setScopeSaving(true);
    const res = await api({ action: 'update_scope', program_id: selProgramId, scope: scopeVal.trim() || null });
    if (res.error) showToast(res.error);
    else { showToast('Scope saved'); setScopeDirty(false); }
    setScopeSaving(false);
  };

  const saveHeader = async () => {
    if (scopeDirty) await saveScope();
    if (statusEdit) await saveStatus();
    if (!scopeDirty && !statusEdit) showToast('Nothing to save');
  };

  const saveDiscrepancy = async (taskId: string) => {
    setDiscSaving(true);
    const res = await api({ action: 'update_discrepancy_note', task_id: taskId, discrepancy_note: discVal.trim() || null });
    if (res.error) showToast(res.error);
    else { showToast('Discrepancy note saved'); setDiscEditId(null); }
    setDiscSaving(false);
    loadFullTree(selProgramId);
  };

  const saveProgram = async () => {
    await api({ action: 'upsert_program', code: editProgram.code, title: { en: editProgram.title_en }, owner: editProgram.owner || null, status: editProgram.status, total_fte_days: editProgram.total_fte_days ? Number(editProgram.total_fte_days) : null, target_date: editProgram.target_date || null });
    setDrawer(null); showToast('Program saved'); loadPrograms();
  };
  const savePhase = async () => {
    await api({ action: 'upsert_phase', program_id: selProgramId, seq: Number(editPhase.seq), title: { en: editPhase.title_en }, fte_days: editPhase.fte_days ? Number(editPhase.fte_days) : null, status: editPhase.status, go_signal: editPhase.go_signal || null });
    setDrawer(null); showToast('Phase saved'); loadFullTree(selProgramId); loadPrograms();
  };
  const saveTask = async () => {
    await api({ action: 'upsert_task', phase_id: drawerCtx.phaseId, seq: Number(editTask.seq), title: { en: editTask.title_en }, task_type: editTask.task_type, estimate_h: editTask.estimate_h ? Number(editTask.estimate_h) : null, ref_spec_section: editTask.ref_spec_section || null, impl_notes: editTask.impl_notes || null });
    setDrawer(null); showToast('Task saved'); loadFullTree(selProgramId); loadPrograms();
  };
  const saveDeliv = async () => {
    await api({ action: 'upsert_deliverable', task_id: drawerCtx.taskId, kind: editDeliv.kind, ref: editDeliv.ref, verify_mode: editDeliv.verify_mode, sort_order: Number(editDeliv.sort_order) });
    setDrawer(null); showToast('Deliverable added'); if (drawerCtx.taskId) loadDeliverables(drawerCtx.taskId); loadFullTree(selProgramId); loadPrograms();
  };
  const deleteDeliv = async (id: string, taskId: string) => {
    await api({ action: 'delete_deliverable', id }); showToast('Deleted'); loadDeliverables(taskId); loadFullTree(selProgramId); loadPrograms();
  };
  const deleteTask = async (id: string) => {
    await api({ action: 'delete_task', id }); showToast('Task deleted'); loadFullTree(selProgramId); loadPrograms();
  };

  const selProgram = programs.find(p => p.program_id === selProgramId);
  const totalDel = programs.reduce((s, p) => s + p.total_deliverables, 0);
  const verifiedDel = programs.reduce((s, p) => s + p.verified_deliverables, 0);
  const totalTasksAll = programs.reduce((s, p) => s + p.total_tasks, 0);
  const verifiedTasksAll = programs.reduce((s, p) => s + p.verified_tasks, 0);
  const avgPct = programs.length ? Math.round(programs.reduce((s, p) => s + p.pct, 0) / programs.length) : 0;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Implementation Cockpit" description="Track implementation programs, phases, tasks and deliverables — SY051" />
        <div className="flex items-center gap-2">
          <button onClick={() => { loadPrograms(); if (selProgramId) { loadFullTree(selProgramId); loadDocs(selProgramId); } showToast('Refreshed'); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
          <button onClick={() => window.history.back()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
        </div>
      </div>

      {toast && <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg animate-pulse">{toast}</div>}

      {/* Top bar: Program picker + tabs + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400">Program</span>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-blue-400 focus:outline-none min-w-[220px]"
            value={selProgramId} onChange={e => setSelProgramId(e.target.value)}>
            <option value="">— Select program —</option>
            {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.code} — {t(p.title)}</option>)}
          </select>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          {(['tree', 'dashboard'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${tab === tb ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tb === 'dashboard' ? 'Dashboard' : 'Tree View'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setEditProgram({ code: '', title_en: '', owner: '', status: 'draft', total_fte_days: '', target_date: '' }); setDrawer('program'); }}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">+ Program</button>
          {selProgramId && (
            <>
              <button onClick={() => { setEditPhase({ seq: String(phases.length), title_en: '', fte_days: '', status: 'not_started', go_signal: '' }); setDrawer('phase'); }}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">+ Phase</button>
              <button onClick={verifyAll} disabled={verifying}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {verifying ? 'Verifying...' : 'Verify All'}
              </button>
              <button onClick={async () => {
                if (!confirm(`Delete program "${selProgram?.code}" and ALL its phases, tasks, deliverables and documents? This cannot be undone.`)) return;
                const r = await api({ action: 'delete_program', program_id: selProgramId });
                if (r.error) { showToast(r.error); return; }
                showToast('Program deleted'); setSelProgramId(''); loadPrograms();
              }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">Delete Program</button>
            </>
          )}
        </div>
      </div>

      {/* Program summary bar — compact */}
      {selProgram && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono font-bold text-slate-400">{selProgram.code}</span>
            <button onClick={() => { setStatusEdit({ type: 'program', id: selProgram.program_id, current: selProgram.status }); setStatusNew(selProgram.status); setStatusNote(selProgram.status_note ?? ''); }}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${SC[selProgram.status] ?? SC.draft}`}>
              {selProgram.status} ✎
            </button>
            {selProgram.owner && <span className="text-slate-400">{selProgram.owner}</span>}
            {selProgram.target_date && <span className="text-slate-400">T: {selProgram.target_date}</span>}
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">{selProgram.completed_phases}/{selProgram.total_phases} ph</span>
            <span className="text-slate-400">{selProgram.verified_tasks}/{selProgram.total_tasks} tasks</span>
            <span className="text-slate-400">{selProgram.verified_deliverables}/{selProgram.total_deliverables} deliv</span>
            <span className="text-slate-300">|</span>
            {/* OP001 Task Link — program level */}
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              {programOpTask ? (
                <>
                  <span className="text-[10px] font-medium text-orange-600">OP001:</span>
                  <span className="text-[10px] text-slate-600 truncate max-w-[180px]" title={programOpTask.title}>{programOpTask.title}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${programOpTask.status === 'done' ? 'bg-emerald-50 text-emerald-600' : programOpTask.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{programOpTask.status}</span>
                  <button onClick={async () => {
                    await api({ action: 'link_op_task', program_id: selProgram.program_id, op_task_id: null });
                    setProgramOpTask(null);
                    showToast('OP001 unlinked');
                  }} className="rounded px-1 py-0.5 text-[8px] text-red-400 hover:bg-red-50">×</button>
                </>
              ) : linkingProgram ? (
                <OpTaskPicker
                  onSelect={async (opId) => {
                    const r = await api({ action: 'link_op_task', program_id: selProgram.program_id, op_task_id: opId });
                    if (r.error) { showToast(r.error); return; }
                    const op = await api({ action: 'fetch_op_task', task_id: opId });
                    if (op.op_task) setProgramOpTask(op.op_task);
                    setLinkingProgram(false); showToast('OP001 linked');
                  }}
                  onCancel={() => setLinkingProgram(false)}
                />
              ) : (
                <button onClick={() => setLinkingProgram(true)}
                  className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-medium text-orange-600 hover:bg-orange-100">
                  Link OP001
                </button>
              )}
            </div>
            {/* OP002 Goal Link — program level */}
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              {programOpGoal ? (
                <>
                  <span className="text-[10px] font-medium text-purple-600">OP002:</span>
                  <span className="text-[10px] text-slate-600 truncate max-w-[180px]" title={programOpGoal.title}>{programOpGoal.goal_number} — {programOpGoal.title}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${programOpGoal.health === 'on_track' ? 'bg-emerald-50 text-emerald-600' : programOpGoal.health === 'at_risk' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{programOpGoal.health?.replace('_', ' ')}</span>
                  <button onClick={async () => {
                    await api({ action: 'link_op_goal', program_id: selProgram.program_id, op_goal_id: null });
                    setProgramOpGoal(null);
                    showToast('OP002 unlinked');
                  }} className="rounded px-1 py-0.5 text-[8px] text-red-400 hover:bg-red-50">×</button>
                </>
              ) : linkingGoal ? (
                <OpGoalPicker
                  onSelect={async (goalId) => {
                    const r = await api({ action: 'link_op_goal', program_id: selProgram.program_id, op_goal_id: goalId });
                    if (r.error) { showToast(r.error); return; }
                    const g = await api({ action: 'fetch_program_op_goal', program_id: selProgram.program_id });
                    if (g.op_goal) setProgramOpGoal(g.op_goal);
                    setLinkingGoal(false); showToast('OP002 linked');
                  }}
                  onCancel={() => setLinkingGoal(false)}
                />
              ) : (
                <button onClick={() => setLinkingGoal(true)}
                  className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium text-purple-600 hover:bg-purple-100">
                  Link OP002
                </button>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-32 flex items-center gap-1.5">
                <Bar pct={selProgram.pct} h="h-2" />
                <span className="text-xs font-bold text-slate-700">{selProgram.pct}%</span>
              </div>
              <button onClick={saveHeader} disabled={scopeSaving || statusSaving}
                className={`rounded-lg px-3 py-1 text-xs font-semibold shadow-sm transition-all ${scopeDirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'} disabled:opacity-50`}>
                {scopeSaving || statusSaving ? '...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Status change inline form */}
          {statusEdit?.type === 'program' && statusEdit.id === selProgram.program_id && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
              <div className="flex items-center gap-2">
                <select className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
                  value={statusNew} onChange={e => setStatusNew(e.target.value)}>
                  {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none placeholder:text-slate-300"
                  placeholder="Reason..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                <button onClick={saveStatus} disabled={statusSaving || (statusNew === statusEdit.current && !statusNote.trim())}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {statusSaving ? '...' : 'Save'}
                </button>
                <button onClick={() => setStatusEdit(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
            </div>
          )}

          {/* Scope — implementation goal */}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold uppercase text-slate-400 mt-1 flex-shrink-0">Scope</span>
              <textarea
                className="flex-1 rounded border border-slate-200 bg-slate-50/50 px-2 py-1 text-xs text-slate-700 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:bg-white resize-none"
                rows={2}
                placeholder="What is the goal/aim of this implementation program..."
                value={scopeVal}
                onChange={e => { setScopeVal(e.target.value); setScopeDirty(true); }}
              />
              {scopeSaving && <span className="text-[10px] text-blue-400 mt-1">Saving...</span>}
            </div>
          </div>
        </div>
      )}

      {/* Documents section */}
      {selProgram && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700">Documents</h2>
              <span className="text-[10px] text-slate-400">{(docsTotalSize / 1024 / 1024).toFixed(1)} / {(docsMaxSize / 1024 / 1024).toFixed(0)} MB used</span>
              <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all ${docsTotalSize / docsMaxSize > 0.8 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${Math.min(100, (docsTotalSize / docsMaxSize) * 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer">
                <input type="file" className="hidden" accept=".md,.txt,.markdown" disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f, 'ai_spec'); e.target.value = ''; }} />
                {uploading ? '...' : '+ AI Spec'}
              </label>
              <label className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.docx,.xlsx,.pptx,.md,.txt,.png,.jpg,.jpeg,.svg" disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f, 'impl_plan'); e.target.value = ''; }} />
                {uploading ? '...' : '+ Impl Plan'}
              </label>
              <label className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 cursor-pointer">
                <input type="file" className="hidden" accept=".md,.txt,.markdown,.pdf,.docx" disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f, 'user_manual'); e.target.value = ''; }} />
                {uploading ? '...' : '+ User Manual'}
              </label>
              <label className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-medium text-cyan-700 hover:bg-cyan-100 cursor-pointer">
                <input type="file" className="hidden" accept=".md,.txt,.markdown,.pdf,.docx" disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f, 'test_scenario'); e.target.value = ''; }} />
                {uploading ? '...' : '+ Test Scenario'}
              </label>
            </div>
          </div>
          {docs.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No documents attached. Upload an AI spec (.md) or implementation plan.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {docs.map(d => {
                const isAI = d.name.startsWith('ai-spec_');
                const isPlan = d.name.startsWith('impl-plan_');
                const isManual = d.name.startsWith('user-manual_');
                const isTest = d.name.startsWith('test-scenario_');
                const displayName = d.name.replace(/^(ai-spec_|impl-plan_|user-manual_|test-scenario_|doc_)/, '');
                const sizeMB = (d.size / 1024).toFixed(d.size > 1024 * 1024 ? 1 : 0);
                const sizeLabel = d.size > 1024 * 1024 ? `${(d.size / 1024 / 1024).toFixed(1)} MB` : `${sizeMB} KB`;
                const docMeta = isAI ? { bg: 'bg-indigo-50', text: 'text-indigo-500', tagBg: 'bg-indigo-50 text-indigo-600', label: 'AI Spec', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' }
                  : isManual ? { bg: 'bg-amber-50', text: 'text-amber-500', tagBg: 'bg-amber-50 text-amber-600', label: 'User Manual', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' }
                  : isTest ? { bg: 'bg-cyan-50', text: 'text-cyan-500', tagBg: 'bg-cyan-50 text-cyan-600', label: 'Test Scenario', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' }
                  : isPlan ? { bg: 'bg-emerald-50', text: 'text-emerald-500', tagBg: 'bg-emerald-50 text-emerald-600', label: 'Impl Plan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
                  : { bg: 'bg-slate-100', text: 'text-slate-400', tagBg: 'bg-slate-100 text-slate-500', label: 'Doc', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' };
                return (
                  <div key={d.path} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${docMeta.bg}`}>
                      <svg className={`h-4 w-4 ${docMeta.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={docMeta.icon} /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 truncate">{displayName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${docMeta.tagBg}`}>
                          {docMeta.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{sizeLabel} · {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</div>
                    </div>
                    <button onClick={() => setPreviewDoc({ path: d.path, name: displayName, mimetype: String(d.mimetype) })} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-indigo-500 hover:bg-indigo-50" title="Preview">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button onClick={() => downloadDoc(d.path, displayName)} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-blue-500 hover:bg-blue-50" title="Download">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    <button onClick={() => { if (confirm(`Delete ${displayName}?`)) deleteDoc(d.path); }}
                      className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Document preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreviewDoc(null)} />
          <div className="relative flex flex-col w-[90vw] h-[90vh] max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-sm font-semibold text-slate-700 truncate">{previewDoc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { downloadDoc(previewDoc.path, previewDoc.name); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
                <button onClick={() => window.open(`/api/bop/sys/impl/docs/preview?path=${encodeURIComponent(previewDoc.path)}`, '_blank')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  New Tab
                </button>
                <button onClick={() => setPreviewDoc(null)}
                  className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/api/bop/sys/impl/docs/preview?path=${encodeURIComponent(previewDoc.path)}`}
                className="w-full h-full border-0"
                title={previewDoc.name}
              />
            </div>
          </div>
        </div>
      )}

      {loading && <div className="p-8 text-center text-sm text-slate-400">Loading...</div>}

      {/* No program selected — show program cards */}
      {!loading && !selProgramId && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="text-slate-400 text-sm">Select a program above to view the implementation tree, or create a new one.</div>
          {programs.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {programs.map(p => (
                <button key={p.program_id} onClick={() => setSelProgramId(p.program_id)}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{p.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SC[p.status] ?? SC.draft}`}>{p.status}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 mt-1">{t(p.title)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Bar pct={p.pct} />
                    <span className="text-xs font-bold text-slate-500">{p.pct}%</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">{p.total_phases} phases · {p.total_tasks} tasks · {p.total_deliverables} deliverables</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ DASHBOARD TAB ═══ */}
      {tab === 'dashboard' && selProgramId && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Programs', value: programs.length, sub: `${programs.filter(p => p.status === 'active').length} active` },
              { label: 'Overall Progress', value: `${avgPct}%`, sub: `across ${programs.length} programs` },
              { label: 'Tasks', value: `${verifiedTasksAll}/${totalTasksAll}`, sub: 'verified' },
              { label: 'Deliverables', value: `${verifiedDel}/${totalDel}`, sub: 'verified' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-semibold uppercase text-slate-400">{k.label}</div>
                <div className="mt-1 text-2xl font-bold text-slate-800">{k.value}</div>
                <div className="text-[10px] text-slate-400">{k.sub}</div>
              </div>
            ))}
          </div>

          {selProgram && phases.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Phase Progress — {t(selProgram.title)}</h2>
              </div>
              <div className="p-4 space-y-3">
                {phases.map(ph => (
                  <div key={ph.phase_id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-[10px] font-mono font-bold text-slate-400 text-center">{ph.seq}</span>
                        <span className="text-sm font-medium text-slate-700">{t(ph.title)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SC[ph.status] ?? SC.not_started}`}>{ph.status?.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{ph.pct}%</span>
                    </div>
                    <Bar pct={ph.pct} h="h-3" />
                    <div className="mt-0.5 flex gap-4 text-[10px] text-slate-400">
                      <span>{ph.verified_tasks}/{ph.total_tasks} tasks</span>
                      <span>{ph.verified_deliverables}/{ph.total_deliverables} deliverables</span>
                      {ph.fte_days && <span>{ph.fte_days} FTE days</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {programs.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-700">All Programs</h2>
              </div>
              <div className="p-4 space-y-3">
                {programs.map(p => (
                  <div key={p.program_id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-1 -m-1" onClick={() => setSelProgramId(p.program_id)}>
                    <span className="w-16 text-xs font-mono font-bold text-slate-400">{p.code}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{t(p.title)}</span>
                    <div className="w-40"><Bar pct={p.pct} /></div>
                    <span className="w-10 text-right text-xs font-bold text-slate-500">{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TREE VIEW TAB ═══ */}
      {tab === 'tree' && selProgramId && (
        <div className="space-y-1">
          <div className="flex gap-2 mb-2">
            <button onClick={expandAll} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">Expand all</button>
            <span className="text-slate-300">|</span>
            <button onClick={collapseAll} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">Collapse all</button>
          </div>

          {phases.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No phases. Click + Phase to start.</div>
          )}

          {phases.map(ph => {
            const phOpen = expandedPhases.has(ph.phase_id);
            const phTasks = tasksByPhase[ph.phase_id] ?? [];
            return (
              <div key={ph.phase_id} className={`rounded-xl border overflow-hidden ${phOpen ? 'border-blue-200 bg-blue-50/30 shadow-sm' : 'border-slate-200 bg-white'}`}>
                {/* Phase row */}
                <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => togglePhase(ph.phase_id)}>
                  <ChevRight open={phOpen} />
                  <div className="flex items-center gap-1.5 rounded bg-slate-50 px-1.5 py-0.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <span className="text-[10px] font-mono font-bold text-slate-500">P{ph.seq}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800">{t(ph.title)}</span>
                  <button onClick={e => { e.stopPropagation(); setStatusEdit({ type: 'phase', id: ph.phase_id, current: ph.status }); setStatusNew(ph.status); setStatusNote(ph.status_note ?? ''); }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${SC[ph.status] ?? SC.not_started}`}>
                    {ph.status?.replace(/_/g, ' ')} ✎
                  </button>
                  {ph.go_signal && <span className="text-[10px] text-amber-500 italic">gate: {ph.go_signal}</span>}
                  {ph.status_note && <span className="text-[10px] text-slate-500 italic truncate max-w-[200px]" title={ph.status_note}>{ph.status_note}</span>}
                  <span className="text-[10px] text-slate-400 ml-auto mr-2">
                    {ph.verified_tasks}/{ph.total_tasks} tasks · {ph.verified_deliverables}/{ph.total_deliverables} deliv
                    {phTasks.length > 0 && (() => { const tested = phTasks.filter(t => t.tested).length; return tested > 0 ? ` · ${tested}/${phTasks.length} tested` : ''; })()}
                  </span>
                  <div className="w-24"><Bar pct={ph.pct} h="h-1.5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{ph.pct}%</span>
                  <button onClick={e => { e.stopPropagation(); setDrawerCtx({ phaseId: ph.phase_id }); setEditTask({ seq: String(phTasks.length), title_en: '', task_type: 'general', estimate_h: '', ref_spec_section: '', impl_notes: '' }); setDrawer('task'); }}
                    className="ml-1 rounded border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50" title="Add task">+</button>
                </div>

                {/* Phase status edit inline */}
                {statusEdit?.type === 'phase' && statusEdit.id === ph.phase_id && (
                  <div className="border-t border-blue-100 bg-blue-50/30 px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">Phase status:</span>
                          <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
                            value={statusNew} onChange={e => setStatusNew(e.target.value)}>
                            {PHASE_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <input className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none placeholder:text-slate-300"
                          placeholder="Status description / reason..."
                          value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <button onClick={saveStatus} disabled={statusSaving || (statusNew === statusEdit.current && !statusNote.trim())}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          {statusSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setStatusEdit(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks under phase */}
                {phOpen && (
                  <div className="border-t border-slate-100">
                    {phTasks.length === 0 && <div className="py-3 pl-12 text-xs text-slate-400">No tasks in this phase</div>}
                    {phTasks.map(tk => {
                      const tkOpen = expandedTasks.has(tk.task_id);
                      const delivs = delivsByTask[tk.task_id] ?? [];
                      return (
                        <div key={tk.task_id} className="border-t border-slate-50">
                          {/* Task row */}
                          <div className="flex items-center gap-2 px-3 py-2 pl-8 cursor-pointer hover:bg-slate-50/70 transition-colors" onClick={() => toggleTask(tk.task_id)}>
                            <ChevRight open={tkOpen} />
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            <span className="text-sm text-slate-700">{t(tk.title)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TC[tk.task_type] ?? TC.general}`}>{tk.task_type}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SC[tk.derived_status] ?? SC.not_started}`}>{tk.derived_status?.replace(/_/g, ' ')}</span>
                            {tk.blocked_reason && <span className="text-[10px] text-red-500 truncate max-w-[120px]">{tk.blocked_reason}</span>}
                            <span className="text-[10px] text-slate-400 ml-auto mr-2">{tk.verified_deliverables}/{tk.total_deliverables}</span>
                            <div className="w-16"><Bar pct={tk.pct} h="h-1.5" /></div>
                            <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{tk.pct}%</span>
                            <div className="flex items-center gap-1 ml-1">
                              <button onClick={e => { e.stopPropagation(); verifyTask(tk.task_id); }} disabled={verifying}
                                className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50 disabled:opacity-50" title="Verify">V</button>
                              <a href={`/console/sys/impl/tasks?task_id=${tk.task_id}`} onClick={e => e.stopPropagation()}
                                className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-blue-500 hover:bg-blue-50" title="Detail page">D</a>
                              <button onClick={e => { e.stopPropagation(); setDrawerCtx({ taskId: tk.task_id }); setEditDeliv({ kind: 'SCREEN', ref: '', verify_mode: 'auto', sort_order: String(delivs.length) }); setDrawer('deliverable'); }}
                                className="rounded border border-blue-200 px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50" title="Add deliverable">+</button>
                              <button onClick={e => { e.stopPropagation(); if (confirm('Delete task?')) deleteTask(tk.task_id); }}
                                className="rounded border border-red-100 px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-50" title="Delete">×</button>
                            </div>
                          </div>

                          {/* Tested + Discrepancy note + Deliverables under task */}
                          {tkOpen && (
                            <div className="bg-slate-50/50">
                              {/* Tested checkbox + Discrepancy note — same row */}
                              <div className="flex items-center gap-2 px-3 py-1.5 pl-12 border-t border-slate-100/80">
                                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0" title={tk.tested_at ? `Tested ${new Date(tk.tested_at).toLocaleString()} by ${tk.tested_by}` : 'Not tested'}>
                                  <input
                                    type="checkbox"
                                    checked={tk.tested}
                                    onChange={async (e) => {
                                      const checked = e.target.checked;
                                      await api({ action: 'update_tested', task_id: tk.task_id, tested: checked });
                                      showToast(checked ? 'Marked as tested' : 'Test status cleared');
                                      loadFullTree(selProgramId);
                                    }}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                                  />
                                  <span className={`text-[9px] font-semibold uppercase ${tk.tested ? 'text-emerald-600' : 'text-slate-400'}`}>Tested</span>
                                  {tk.tested && tk.tested_at && (
                                    <span className="text-[8px] text-slate-400">{new Date(tk.tested_at).toLocaleDateString()}</span>
                                  )}
                                </label>
                                <span className="text-slate-200">|</span>
                                {discEditId === tk.task_id ? (
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-[9px] font-semibold uppercase text-amber-500 flex-shrink-0">Discrepancy</span>
                                    <input
                                      className="flex-1 rounded border border-amber-200 bg-white px-2 py-0.5 text-[10px] text-slate-700 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
                                      placeholder="Deviations from spec — what changed and why..."
                                      value={discVal}
                                      onChange={e => setDiscVal(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') saveDiscrepancy(tk.task_id); if (e.key === 'Escape') setDiscEditId(null); }}
                                      autoFocus
                                    />
                                    <button onClick={() => saveDiscrepancy(tk.task_id)} disabled={discSaving}
                                      className="rounded bg-amber-500 px-2 py-0.5 text-[9px] font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                                      {discSaving ? '...' : 'Save'}
                                    </button>
                                    <button onClick={() => setDiscEditId(null)} className="text-[9px] text-slate-400 hover:text-slate-600">Cancel</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-[9px] font-semibold uppercase text-amber-500 flex-shrink-0">Discrepancy</span>
                                    {tk.discrepancy_note ? (
                                      <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 flex-1 truncate" title={tk.discrepancy_note}>{tk.discrepancy_note}</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-300 italic">None</span>
                                    )}
                                    <button onClick={() => { setDiscEditId(tk.task_id); setDiscVal(tk.discrepancy_note ?? ''); }}
                                      className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-400 hover:bg-slate-100">Edit</button>
                                  </div>
                                )}
                              </div>
                              {delivs.length === 0 && <div className="py-2 pl-16 text-[10px] text-slate-400">No deliverables — click + to add</div>}
                              {delivs.map(d => (
                                <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 pl-16 border-t border-slate-100/80 text-xs hover:bg-white/60">
                                  {d.is_verified ? (
                                    <svg className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  ) : d.verify_error ? (
                                    <svg className="h-3.5 w-3.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                  )}
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${KC[d.kind] ?? KC.CUSTOM}`}>{d.kind}</span>
                                  <span className="text-xs font-mono text-slate-600 truncate flex-1">{d.ref}</span>
                                  <span className={`text-[9px] ${d.verify_mode === 'auto' ? 'text-blue-400' : 'text-slate-400'}`}>{d.verify_mode}</span>
                                  {d.verified_at && <span className="text-[9px] text-slate-400">{new Date(d.verified_at).toLocaleDateString()}</span>}
                                  {d.verify_error && <span className="text-[9px] text-red-400 truncate max-w-[100px]" title={d.verify_error}>err</span>}
                                  <button onClick={() => { if (confirm('Delete?')) deleteDeliv(d.id, tk.task_id); }}
                                    className="rounded p-0.5 text-red-300 hover:bg-red-50 hover:text-red-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ DRAWERS ═══ */}
      <Drawer open={drawer === 'program'} onClose={() => setDrawer(null)} title="New Program">
        <Field label="Code"><input className={ic} value={editProgram.code} onChange={e => setEditProgram(p => ({ ...p, code: e.target.value }))} placeholder="e.g. DESSHOP" /></Field>
        <Field label="Title (EN)"><input className={ic} value={editProgram.title_en} onChange={e => setEditProgram(p => ({ ...p, title_en: e.target.value }))} /></Field>
        <Field label="Owner"><input className={ic} value={editProgram.owner} onChange={e => setEditProgram(p => ({ ...p, owner: e.target.value }))} /></Field>
        <Field label="Status"><select className={ic} value={editProgram.status} onChange={e => setEditProgram(p => ({ ...p, status: e.target.value }))}>{PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Total FTE Days"><input className={ic} type="number" value={editProgram.total_fte_days} onChange={e => setEditProgram(p => ({ ...p, total_fte_days: e.target.value }))} /></Field>
        <Field label="Target Date"><input className={ic} type="date" value={editProgram.target_date} onChange={e => setEditProgram(p => ({ ...p, target_date: e.target.value }))} /></Field>
        <div className="flex gap-2 mt-6"><button className={bp} onClick={saveProgram}>Save</button><button className={bs} onClick={() => setDrawer(null)}>Cancel</button></div>
      </Drawer>

      <Drawer open={drawer === 'phase'} onClose={() => setDrawer(null)} title="New Phase">
        <Field label="Sequence #"><input className={ic} type="number" value={editPhase.seq} onChange={e => setEditPhase(p => ({ ...p, seq: e.target.value }))} /></Field>
        <Field label="Title (EN)"><input className={ic} value={editPhase.title_en} onChange={e => setEditPhase(p => ({ ...p, title_en: e.target.value }))} /></Field>
        <Field label="FTE Days"><input className={ic} type="number" value={editPhase.fte_days} onChange={e => setEditPhase(p => ({ ...p, fte_days: e.target.value }))} /></Field>
        <Field label="Status"><select className={ic} value={editPhase.status} onChange={e => setEditPhase(p => ({ ...p, status: e.target.value }))}>{PHASE_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></Field>
        <Field label="Gate Signal"><input className={ic} value={editPhase.go_signal} onChange={e => setEditPhase(p => ({ ...p, go_signal: e.target.value }))} placeholder="e.g. Phase 0 verified" /></Field>
        <div className="flex gap-2 mt-6"><button className={bp} onClick={savePhase}>Save</button><button className={bs} onClick={() => setDrawer(null)}>Cancel</button></div>
      </Drawer>

      <Drawer open={drawer === 'task'} onClose={() => setDrawer(null)} title="New Task">
        <Field label="Sequence #"><input className={ic} type="number" value={editTask.seq} onChange={e => setEditTask(p => ({ ...p, seq: e.target.value }))} /></Field>
        <Field label="Title (EN)"><input className={ic} value={editTask.title_en} onChange={e => setEditTask(p => ({ ...p, title_en: e.target.value }))} /></Field>
        <Field label="Task Type"><select className={ic} value={editTask.task_type} onChange={e => setEditTask(p => ({ ...p, task_type: e.target.value }))}>{TASK_TYPES.map(tt => <option key={tt}>{tt}</option>)}</select></Field>
        <Field label="Estimate (hours)"><input className={ic} type="number" value={editTask.estimate_h} onChange={e => setEditTask(p => ({ ...p, estimate_h: e.target.value }))} /></Field>
        <Field label="Spec Reference"><input className={ic} value={editTask.ref_spec_section} onChange={e => setEditTask(p => ({ ...p, ref_spec_section: e.target.value }))} /></Field>
        <Field label="Notes"><textarea className={ic} rows={3} value={editTask.impl_notes} onChange={e => setEditTask(p => ({ ...p, impl_notes: e.target.value }))} /></Field>
        <div className="flex gap-2 mt-6"><button className={bp} onClick={saveTask}>Save</button><button className={bs} onClick={() => setDrawer(null)}>Cancel</button></div>
      </Drawer>

      <Drawer open={drawer === 'deliverable'} onClose={() => setDrawer(null)} title="New Deliverable">
        <Field label="Kind"><select className={ic} value={editDeliv.kind} onChange={e => setEditDeliv(p => ({ ...p, kind: e.target.value }))}>{DELIVERABLE_KINDS.map(k => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Reference"><input className={ic} value={editDeliv.ref} onChange={e => setEditDeliv(p => ({ ...p, ref: e.target.value }))} placeholder="e.g. SY051 in bop_objects" /></Field>
        <Field label="Verify Mode">
          <div className="flex gap-4 mt-1">{(['auto', 'manual'] as const).map(m => (
            <label key={m} className="flex items-center gap-1.5 text-sm text-slate-600"><input type="radio" name="vmode" checked={editDeliv.verify_mode === m} onChange={() => setEditDeliv(p => ({ ...p, verify_mode: m }))} className="accent-blue-600" />{m}</label>
          ))}</div>
        </Field>
        <Field label="Sort Order"><input className={ic} type="number" value={editDeliv.sort_order} onChange={e => setEditDeliv(p => ({ ...p, sort_order: e.target.value }))} /></Field>
        <div className="flex gap-2 mt-6"><button className={bp} onClick={saveDeliv}>Add</button><button className={bs} onClick={() => setDrawer(null)}>Cancel</button></div>
      </Drawer>
    </div>
  );
}
