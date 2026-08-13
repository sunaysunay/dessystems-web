'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import {
  ArrowLeft, ChevronRight, Clock, FileText, Send, ExternalLink,
} from 'lucide-react';

const DEAL_STAGES = [
  'discovery', 'sourcing', 'vehicle_matched', 'quoted',
  'negotiation', 'reserved', 'sold',
] as const;
const TERMINAL_STAGES = ['closed_won', 'closed_lost'] as const;

const STAGE_STYLE: Record<string, string> = {
  discovery: 'bg-blue-100 text-blue-700 border-blue-200',
  sourcing: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  vehicle_matched: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  quoted: 'bg-violet-100 text-violet-700 border-violet-200',
  negotiation: 'bg-orange-100 text-orange-700 border-orange-200',
  reserved: 'bg-amber-100 text-amber-700 border-amber-200',
  sold: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed_won: 'bg-green-100 text-green-700 border-green-200',
  closed_lost: 'bg-slate-100 text-slate-400 border-slate-200',
};

const EVENT_ICON: Record<string, string> = {
  'deal.created': '💼', 'stage.changed': '📊', 'lead.converted': '🎯',
  'note.added': '📝', 'call.logged': '📞', 'email.sent': '📤',
  'email.received': '📥', 'appointment.created': '📅', 'lead.created': '🆕',
};

const EVENT_STYLE: Record<string, string> = {
  'stage.changed': 'border-l-2 border-l-blue-300',
  'deal.created': 'border-l-2 border-l-violet-300 bg-violet-50/50',
  'lead.converted': 'border-l-2 border-l-emerald-300',
};

const ACT_TYPES = [
  { key: 'note', label: 'Note', icon: '📝', event: 'note.added' },
  { key: 'call', label: 'Call', icon: '📞', event: 'call.logged' },
  { key: 'task', label: 'Task', icon: '✅', event: 'note.added' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type Tab = 'timeline' | 'stage_history';

export default function DealWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { unit, user } = useScope();

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<Tab>('timeline');
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [actForm, setActForm] = useState({ type: 'note', body: '', subject: '' });
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/crm/deals/${id}?tenant_id=${unit.id}`).then(r => r.json());
    setDeal(j.deal ?? null);
    setLoading(false);
  }, [id, unit.id]);
  useEffect(() => { void load(); }, [load]);

  async function patchDeal(fields: Record<string, any>) {
    setSaving(true);
    const res = await fetch(`/api/bop/crm/deals/${id}?tenant_id=${unit.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, _actor_email: user.email }),
    });
    if (res.ok) { showToast('Saved'); void load(); }
    else { const err = await res.json(); showToast(`Error: ${err.error}`); }
    setSaving(false); setEditField(null);
  }

  async function moveStage(stage: string) {
    await patchDeal({ stage });
  }

  async function logActivity() {
    if (!actForm.body.trim()) return;
    setSaving(true);
    const actType = ACT_TYPES.find(t => t.key === actForm.type);
    await fetch('/api/bop/crm/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: unit.id, deal_id: id,
        event_type: actType?.event || 'note.added',
        actor_type: 'user', actor_id: user.email,
        summary: actForm.subject || actForm.body.trim().slice(0, 200),
        payload: { type: actForm.type, body: actForm.body.trim(), subject: actForm.subject },
      }),
    });
    showToast('Activity logged'); setSaving(false); setLogOpen(false);
    setActForm({ type: 'note', body: '', subject: '' }); void load();
  }

  function toggleExpand(evId: string) {
    setExpandedEvents(prev => { const n = new Set(prev); n.has(evId) ? n.delete(evId) : n.add(evId); return n; });
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!deal) return <div className="p-8 text-slate-400">Deal not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const lead = deal.crm_leads;
  const events: any[] = deal.crm_events ?? [];
  const stageHistory: any[] = deal.stage_history ?? [];
  const stageIndex = DEAL_STAGES.indexOf(deal.stage as any);
  const isTerminal = TERMINAL_STAGES.includes(deal.stage as any);

  return (
    <div className="min-h-screen">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      {/* ── STICKY HEADER ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3 -mx-6 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => router.back()} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <span className="font-mono text-xs font-bold text-slate-400">{deal.ref_code || '—'}</span>

          {editField === 'title' ? (
            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => { if (editValue !== deal.title) void patchDeal({ title: editValue }); else setEditField(null); }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditField(null); }}
              className="flex-1 min-w-[200px] rounded-lg border border-blue-300 px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          ) : (
            <h1 onClick={() => { setEditField('title'); setEditValue(deal.title ?? ''); }}
              className="flex-1 text-sm font-semibold text-slate-800 truncate cursor-pointer hover:text-blue-600"
              title="Click to edit">{deal.title || 'Untitled Deal'}</h1>
          )}

          <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STAGE_STYLE[deal.stage] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {deal.stage?.replace(/_/g, ' ')}
          </span>

          <span className="text-[10px] font-semibold text-slate-400">{deal.probability ?? 0}%</span>

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => setLogOpen(!logOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
              <FileText size={12} /> Log
            </button>
          </div>
        </div>

        {/* Stage stepper */}
        {!isTerminal && (
          <div className="flex items-center gap-1 mt-2.5 overflow-x-auto">
            {DEAL_STAGES.map((s, i) => (
              <div key={s} className="flex items-center flex-shrink-0">
                <button onClick={() => { if (s !== deal.stage) void moveStage(s); }}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                    deal.stage === s ? 'bg-blue-600 text-white'
                    : i < stageIndex ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                  }`}>{s.replace(/_/g, ' ')}</button>
                {i < DEAL_STAGES.length - 1 && <ChevronRight size={10} className="text-slate-300 mx-0.5" />}
              </div>
            ))}
            <div className="ml-3 border-l border-slate-200 pl-3 flex gap-1">
              {TERMINAL_STAGES.map(s => (
                <button key={s} onClick={() => void moveStage(s)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] whitespace-nowrap transition-colors ${
                    s === 'closed_won' ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500'
                  }`}>{s.replace(/_/g, ' ')}</button>
              ))}
            </div>
          </div>
        )}
        {isTerminal && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-400">Deal is {deal.stage.replace(/_/g, ' ')}.</span>
            <button onClick={() => void patchDeal({ stage: 'discovery' })} className="text-[10px] text-blue-600 hover:underline">Reopen</button>
          </div>
        )}
      </div>

      {/* ── Activity compose ──────────────────────────────────── */}
      {logOpen && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-1.5 mb-3">
            {ACT_TYPES.map(t => (
              <button key={t.key} onClick={() => setActForm(p => ({ ...p, type: t.key }))}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  actForm.type === t.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{t.icon} {t.label}</button>
            ))}
          </div>
          <input value={actForm.subject} onChange={e => setActForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="Subject (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <textarea value={actForm.body} onChange={e => setActForm(p => ({ ...p, body: e.target.value }))}
            rows={3} placeholder="What happened?"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setLogOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
            <button onClick={() => { void logActivity(); }} disabled={saving || !actForm.body.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-blue-700 transition-colors">
              <Send size={11} /> {saving ? 'Logging...' : 'Log'}</button>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── CENTER: Tabs + Timeline ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lead origin banner */}
          {lead && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-2.5 flex items-center gap-3">
              <span className="text-[10px] text-blue-600 font-semibold">From Lead</span>
              <span className="font-mono text-xs text-blue-700">{lead.ref_code}</span>
              <span className="text-xs text-blue-600 truncate flex-1">{lead.title}</span>
              <button onClick={() => router.push(`/console/crm/leads/${lead.id}?tenant_id=${unit.id}`)}
                className="rounded-lg border border-blue-200 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                View <ExternalLink size={9} className="inline ml-0.5" />
              </button>
            </div>
          )}

          <div className="flex gap-1 border-b border-slate-200">
            <button onClick={() => setTab('timeline')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>Timeline</button>
            <button onClick={() => setTab('stage_history')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'stage_history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              Stage History
              {stageHistory.length > 0 && <span className="ml-1.5 rounded-full bg-blue-100 text-blue-600 px-1.5 py-0.5 text-[9px] font-bold">{stageHistory.length}</span>}
            </button>
          </div>

          {/* Timeline */}
          {tab === 'timeline' && (
            <div className="rounded-xl border border-slate-200 bg-white">
              {events.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No activity yet</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {events.map((ev: any) => {
                    const isExpanded = expandedEvents.has(ev.id);
                    const hasBody = ev.payload?.body && ev.payload.body.length > 80;
                    return (
                      <div key={ev.id} className={`flex gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors ${EVENT_STYLE[ev.event_type] || ''}`}
                        onClick={() => hasBody && toggleExpand(ev.id)} role={hasBody ? 'button' : undefined}>
                        <span className="text-base flex-shrink-0 mt-0.5">{EVENT_ICON[ev.event_type] ?? '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-600">{ev.event_type.replace('.', ' · ')}</span>
                            {ev.lead_id && !ev.deal_id && <span className="rounded-full bg-blue-50 text-blue-500 px-1.5 py-0.5 text-[8px] font-bold">LEAD</span>}
                            {ev.actor_id && <span className="text-[10px] text-slate-400 truncate">by {ev.actor_id.split('@')[0]}</span>}
                            <span className="ml-auto text-[10px] text-slate-400 flex-shrink-0">{timeAgo(ev.occurred_at)}</span>
                          </div>
                          {ev.summary && <p className={`text-xs text-slate-500 mt-0.5 ${isExpanded ? '' : 'line-clamp-2'}`}>{ev.summary}</p>}
                          {ev.event_type === 'stage.changed' && ev.payload?.from && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${STAGE_STYLE[ev.payload.from] ?? 'bg-slate-100 text-slate-500'}`}>{ev.payload.from?.replace(/_/g, ' ')}</span>
                              <ChevronRight size={10} className="text-slate-400" />
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${STAGE_STYLE[ev.payload.to] ?? 'bg-slate-100 text-slate-500'}`}>{ev.payload.to?.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          {isExpanded && ev.payload?.body && (
                            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-wrap">{ev.payload.body}</div>
                          )}
                          {hasBody && !isExpanded && <button className="text-[10px] text-blue-500 mt-1">Show more</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stage History */}
          {tab === 'stage_history' && (
            <div className="rounded-xl border border-slate-200 bg-white">
              {stageHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No stage changes yet</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stageHistory.map((h: any) => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <Clock size={14} className="text-slate-400 flex-shrink-0" />
                      <div className="flex items-center gap-1.5 flex-1">
                        {h.from_stage ? (
                          <>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${STAGE_STYLE[h.from_stage] ?? 'bg-slate-100 text-slate-500'}`}>{h.from_stage?.replace(/_/g, ' ')}</span>
                            <ChevronRight size={10} className="text-slate-400" />
                          </>
                        ) : <span className="text-[9px] text-slate-400">initial →</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${STAGE_STYLE[h.to_stage] ?? 'bg-slate-100 text-slate-500'}`}>{h.to_stage?.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{h.changed_by?.split('@')[0]}</span>
                      <span className="text-[10px] text-slate-400">{timeAgo(h.changed_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deal Info</p>

            <div className="flex justify-between text-xs"><span className="text-slate-400">Stage</span>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STAGE_STYLE[deal.stage] ?? 'bg-slate-100 text-slate-500'}`}>{deal.stage?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Probability</span><span className="font-semibold text-slate-700">{deal.probability ?? 0}%</span></div>

            {/* Expected value */}
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Expected value</span>
              {editField === 'expected_value' ? (
                <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                  onBlur={() => void patchDeal({ expected_value: editValue ? Number(editValue) : null })}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditField(null); }}
                  className="w-24 text-right rounded border border-blue-300 px-1.5 py-0.5 text-xs focus:outline-none" />
              ) : (
                <span onClick={() => { setEditField('expected_value'); setEditValue(deal.expected_value ?? ''); }}
                  className="font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                  {deal.expected_value ? `€${Number(deal.expected_value).toLocaleString()}` : '—'}</span>
              )}
            </div>

            {/* Close date */}
            <div className="flex justify-between text-xs items-center">
              <span className="text-slate-400">Close date</span>
              <input type="date" value={deal.close_date ? new Date(deal.close_date).toISOString().split('T')[0] : ''}
                onChange={e => void patchDeal({ close_date: e.target.value || null })}
                className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 cursor-pointer" />
            </div>

            <div className="flex justify-between text-xs"><span className="text-slate-400">Owner</span><span className="font-medium text-slate-700">{deal.owner_id?.split('@')[0] || '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Created</span><span className="text-slate-700">{new Date(deal.created_at).toLocaleDateString()}</span></div>
            {deal.updated_at && <div className="flex justify-between text-xs"><span className="text-slate-400">Updated</span><span className="text-slate-500">{timeAgo(deal.updated_at)}</span></div>}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Notes</p>
            {editField === 'notes' ? (
              <div>
                <textarea autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} rows={6}
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditField(null)} className="text-xs text-slate-400">Cancel</button>
                  <button onClick={() => void patchDeal({ notes: editValue })} disabled={saving}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            ) : (
              <div onClick={() => { setEditField('notes'); setEditValue(deal.notes ?? ''); }}
                className="text-sm text-slate-600 whitespace-pre-wrap rounded-lg p-2 min-h-[60px] cursor-pointer hover:bg-slate-50 transition-colors">
                {deal.notes || <span className="text-slate-400 italic">No notes — click to add</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
