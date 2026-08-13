'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import EmailComposer from '@/components/EmailComposer';

const STAGE_COLOR: Record<string,string> = {
  new:'bg-slate-100 text-slate-600', assigned:'bg-violet-100 text-violet-700',
  contacted:'bg-blue-100 text-blue-700', qualified:'bg-cyan-100 text-cyan-700',
  converted:'bg-emerald-100 text-emerald-700', lost:'bg-red-100 text-red-600',
  archived:'bg-slate-200 text-slate-500',
};
const ACT_ICON: Record<string,string> = { call:'📞', email:'✉️', whatsapp:'💬', visit:'🏢', note:'📝', task:'✅' };

interface Transition { to_stage: string; label: Record<string,string> }

export default function CR002Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [actForm, setActForm] = useState({ type:'note', note:'' });
  const [logOpen, setLogOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [convertOpen, setConvertOpen] = useState(false);
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/crm/leads/${id}`).then(r => r.json());
    setLead(j.lead ?? null);
    setLoading(false);
  }, [id]);

  const loadTransitions = useCallback(async () => {
    const j = await fetch(`/api/bop/crm/leads/${id}/transition`).then(r => r.json());
    setTransitions(j.transitions ?? []);
  }, [id]);

  useEffect(() => { void load(); void loadTransitions(); }, [load, loadTransitions]);

  async function doTransition(toStage: string) {
    setSaving(true);
    const res = await fetch(`/api/bop/crm/leads/${id}/transition`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_stage: toStage }),
    }).then(r => r.json());
    if (res.error) showToast(res.error);
    else showToast(`Stage → ${toStage}`);
    setSaving(false);
    void load(); void loadTransitions();
  }

  async function doConvert(target: string) {
    setSaving(true);
    const res = await fetch(`/api/bop/crm/leads/${id}/convert`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    }).then(r => r.json());
    if (res.error) { showToast(res.error); setSaving(false); return; }
    showToast(`Converted — Case ${res.case_id?.slice(0,8)}...`);
    setSaving(false); setConvertOpen(false);
    void load(); void loadTransitions();
  }

  async function logActivity() {
    if (!actForm.note.trim()) return;
    setSaving(true);
    await fetch('/api/bop/crm/activities', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...actForm, lead_id: id }) });
    showToast('Activity logged'); setSaving(false); setLogOpen(false); setActForm({ type:'note', note:'' }); void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!lead) return <div className="p-8 text-slate-400">Lead not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const partner = lead.mdm_business_partners;
  const asset = lead.ast_assets;
  const activities = lead.crm_activities ?? [];
  const isQualified = lead.stage === 'qualified';
  const isTerminal = lead.stage === 'converted' || lead.stage === 'archived';

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title={lead.ref_code ?? lead.title ?? 'Lead Detail'} description={`CR002 — Lead Detail · ${lead.channel ?? lead.source ?? '—'}`}/>

      {/* Converted banner */}
      {lead.stage === 'converted' && lead.converted_case_id && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
          <span className="text-emerald-600 font-semibold text-sm">Converted</span>
          <span className="text-xs text-emerald-500">This lead has been converted to a business case.</span>
          <span className="ml-auto text-xs font-mono text-emerald-600">{lead.converted_case_id.slice(0,8)}...</span>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {/* Stage pill */}
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STAGE_COLOR[lead.stage]??'bg-slate-100 text-slate-500'}`}>{lead.stage}</span>

        {/* Direction badge */}
        {lead.direction && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            lead.direction === 'buy_side' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>{lead.direction === 'buy_side' ? 'Buy-side' : 'Sell-side'}</span>
        )}

        {/* Email button */}
        {partner && (
          <button onClick={() => setShowComposer(true)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            ✉ Email customer
          </button>
        )}

        {/* Transition buttons from adjacency table */}
        {!isTerminal && (
          <div className="flex gap-1.5 flex-wrap">
            {transitions.filter(t => t.to_stage !== 'converted').map(t => (
              <button key={t.to_stage} onClick={() => { void doTransition(t.to_stage); }} disabled={saving}
                className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                  t.to_stage === 'lost'
                    ? 'border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50'
                    : 'border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                }`}>
                → {t.label?.en ?? t.to_stage}
              </button>
            ))}
          </div>
        )}

        {/* Convert split-button for qualified leads */}
        {isQualified && (
          <div className="relative">
            <div className="flex">
              <button onClick={() => { void doConvert('sal_quotations'); }} disabled={saving}
                className="rounded-l-lg border border-emerald-500 bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                Convert → Quotation
              </button>
              <button onClick={() => setConvertOpen(!convertOpen)}
                className="rounded-r-lg border border-l-0 border-emerald-500 bg-emerald-500 px-1.5 py-1 text-white hover:bg-emerald-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {convertOpen && (
              <div className="absolute top-full left-0 mt-1 z-10 rounded-lg border border-slate-200 bg-white shadow-lg py-1 min-w-[180px]">
                <button onClick={() => { void doConvert('sal_orders'); }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">
                  Convert → Order (direct deal)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reopen for lost leads */}
        {lead.stage === 'lost' && transitions.length > 0 && (
          <div className="flex gap-1.5">
            {transitions.map(t => (
              <button key={t.to_stage} onClick={() => { void doTransition(t.to_stage); }} disabled={saving}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
                → {t.label?.en ?? t.to_stage}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => router.back()} className="ml-auto text-xs text-slate-400 hover:text-slate-600">← Back</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {partner && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Contact</p>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                  {(partner.company_name||partner.name||'?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{partner.company_name||partner.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{partner.email} · {partner.phone}</div>
                </div>
              </div>
            </div>
          )}

          {asset && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Interested In</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{asset.make} {asset.model} {asset.year}</div>
                  <div className="text-xs text-slate-400">{asset.vehicle_type} · {asset.asking_price ? `€${Number(asset.asking_price).toLocaleString()}` : '—'}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{asset.status}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Activity</p>
              <button onClick={() => setLogOpen(!logOpen)} className="text-xs text-blue-600 hover:underline">+ Log</button>
            </div>
            {logOpen && (
              <div className="mb-4 rounded-lg bg-slate-50 p-3 space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {['note','call','email','whatsapp','visit','task'].map(t => (
                    <button key={t} onClick={() => setActForm(p => ({...p,type:t}))}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actForm.type===t?'bg-slate-800 text-white':'bg-slate-200 text-slate-600'}`}>
                      {ACT_ICON[t]} {t}
                    </button>
                  ))}
                </div>
                <textarea value={actForm.note} onChange={e => setActForm(p => ({...p,note:e.target.value}))} rows={2} placeholder="Note..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setLogOpen(false)} className="text-xs text-slate-400">Cancel</button>
                  <button onClick={() => { void logActivity(); }} disabled={saving||!actForm.note.trim()} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">{saving?'...':'Log'}</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {activities.length===0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No activity yet</p>
              ) : activities.slice().reverse().map((a:any) => (
                <div key={a.id} className="flex gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                  <span className="text-base">{ACT_ICON[a.type]??'📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 capitalize">{a.type}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    {a.note && <p className="text-xs text-slate-500 mt-0.5">{a.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead Info</p>
            {[
              ['Ref', lead.ref_code],
              ['Direction', lead.direction === 'buy_side' ? 'Buy-side' : lead.direction === 'sell_side' ? 'Sell-side' : '—'],
              ['Channel', lead.channel],
              ['Source', lead.source],
              ['Budget', lead.budget ? `€${Number(lead.budget).toLocaleString()}` : '—'],
              ['Created', new Date(lead.created_at).toLocaleDateString()],
            ].map(([l,v]) => (
              <div key={l as string} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="font-medium text-slate-700">{v||'—'}</span></div>
            ))}
            {lead.notes && <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">{lead.notes}</p>}
          </div>
        </div>
      </div>

      {showComposer && partner && (
        <EmailComposer
          contextType="customer" recordId={partner.id} tenantId={lead.tenant_id}
          onClose={() => setShowComposer(false)}
          onSent={() => { setShowComposer(false); showToast('✓ Email sent'); void load(); }}
        />
      )}
    </div>
  );
}
