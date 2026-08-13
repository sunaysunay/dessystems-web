'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STAGES = ['new','triaged','qualified','converted','disqualified','proposal','negotiation','won','lost'];
const STAGE_HEADER: Record<string,string> = {
  new:'bg-slate-100', triaged:'bg-blue-50', qualified:'bg-cyan-50', converted:'bg-emerald-50',
  disqualified:'bg-slate-50', proposal:'bg-amber-50', negotiation:'bg-orange-50',
  won:'bg-emerald-50', lost:'bg-red-50',
};

export default function CR005Page() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string|null>(null);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  async function load() {
    setLoading(true);
    const j = await fetch('/api/bop/crm/leads?limit=500').then(r => r.json());
    setLeads(j.leads ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function moveStage(leadId: string, stage: string) {
    setMoving(leadId);
    await fetch(`/api/bop/crm/leads/${leadId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ stage }) });
    showToast('Moved'); setMoving(null); void load();
  }

  const board: Record<string, any[]> = {};
  STAGES.forEach(s => { board[s] = leads.filter(l => l.stage === s); });
  const total = leads.length;
  const wonCount = board['won']?.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Pipeline Kanban" description={`CR005 — ${total} leads · ${wonCount} won`}/>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => {
              const cards = board[stage] ?? [];
              return (
                <div key={stage} className="w-56 flex-shrink-0">
                  <div className={`rounded-t-xl px-3 py-2 ${STAGE_HEADER[stage]}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-600 capitalize">{stage}</span>
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{cards.length}</span>
                    </div>
                  </div>
                  <div className="rounded-b-xl border border-slate-200 bg-slate-50 p-2 space-y-2 min-h-32">
                    {cards.map(lead => {
                      const partner = lead.mdm_business_partners;
                      const asset = lead.ast_assets;
                      return (
                        <div key={lead.id} className="rounded-lg border border-slate-200 bg-white p-3 cursor-pointer hover:shadow-sm transition-shadow"
                          onClick={() => router.push(`/console/crm/leads/${lead.id}`)}>
                          <p className="text-xs font-semibold text-slate-800 mb-1 leading-tight">{lead.title}</p>
                          {partner && <p className="text-[10px] text-slate-400 truncate">{partner.company_name||partner.name}</p>}
                          {asset && <p className="text-[10px] text-slate-400 truncate">{asset.make} {asset.model} {asset.year}</p>}
                          {lead.budget && <p className="text-[10px] font-semibold text-slate-600 mt-1">€{Number(lead.budget).toLocaleString()}</p>}
                          <div className="mt-2 flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                            {stage !== 'won' && stage !== 'lost' && (() => {
                              const idx = STAGES.indexOf(stage);
                              const next = STAGES[idx+1];
                              return next ? (
                                <button onClick={() => { void moveStage(lead.id, next); }} disabled={moving === lead.id}
                                  className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50">
                                  → {next}
                                </button>
                              ) : null;
                            })()}
                            {stage !== 'lost' && (
                              <button onClick={() => { void moveStage(lead.id, 'lost'); }} disabled={moving === lead.id}
                                className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50">
                                lost
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {cards.length === 0 && <div className="py-4 text-center text-[10px] text-slate-300">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
