'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', confirmed:'bg-blue-100 text-blue-700',
  customer_confirmed:'bg-cyan-100 text-cyan-700', in_preparation:'bg-amber-100 text-amber-700',
  ready:'bg-indigo-100 text-indigo-700', handover_scheduled:'bg-violet-100 text-violet-700',
  delivered:'bg-emerald-100 text-emerald-700', completed:'bg-emerald-200 text-emerald-800',
  cancelled:'bg-red-100 text-red-600',
};
const CANCEL_REASONS = ['customer_withdrew','financing_failed','vehicle_issue','other'];

export default function SA010Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [transitions, setTransitions] = useState<{ to_status: string; guard: string | null }[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelForm, setCancelForm] = useState({ reason_type: 'customer_withdrew', reason: '' });
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const [oRes, tRes] = await Promise.all([
      fetch(`/api/bop/sal/orders/${id}`).then(r => r.json()),
      fetch(`/api/bop/sal/orders/${id}/transition`).then(r => r.json()).catch(() => ({ transitions: [] })),
    ]);
    setOrder(oRes.order ?? null);
    setTransitions(tRes.transitions ?? []);
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function doTransition(to_status: string) {
    setSaving(true);
    const r = await fetch(`/api/bop/sal/orders/${id}/transition`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_status }),
    }).then(r => r.json());
    if (r.error) showToast(r.error);
    else showToast(`Status → ${to_status}`);
    setSaving(false); void load();
  }

  async function doConfirm() {
    setSaving(true);
    const r = await fetch(`/api/bop/sal/orders/${id}/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    }).then(r => r.json());
    if (r.error) showToast(r.error);
    else showToast('Order confirmed — koopovereenkomst sent');
    setSaving(false); void load();
  }

  async function doCancel() {
    if (!cancelForm.reason.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/bop/sal/orders/${id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cancelForm),
    }).then(r => r.json());
    if (r.needs_refund) { showToast('Paid deposits exist — create credit note first'); setSaving(false); return; }
    if (r.error) showToast(r.error);
    else { showToast('Order cancelled'); setCancelOpen(false); }
    setSaving(false); void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!order) return <div className="p-8 text-slate-400">Order not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const partner = order.mdm_business_partners;
  const asset = order.ast_assets;
  const quotation = order.sal_quotations;
  const costs = asset?.ast_cost_items ?? [];
  const totalCosts = costs.reduce((s: number, c: any) => s + (c.amount ?? 0), 0);
  const margin = order.sale_price ? order.sale_price - totalCosts : null;
  const isDraft = order.status === 'draft';
  const isCancelled = order.status === 'cancelled';
  const canCancel = transitions.some(t => t.to_status === 'cancelled');

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title={`Order ${order.order_number || id.slice(0,8)}`} description={`SA010 — Order Detail · ${order.type ?? 'sale'}`}/>

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {order.status?.replace(/_/g, ' ')}
        </span>
        {order.btw_regime && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${order.btw_regime === 'marge' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
            {order.btw_regime === 'marge' ? 'Marge' : 'BTW belast'}
          </span>
        )}

        {/* Action buttons */}
        {isDraft && (
          <button onClick={doConfirm} disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            Confirm Order
          </button>
        )}

        {/* Validated transitions (exclude cancelled — use cancel button instead) */}
        <div className="flex gap-1.5 flex-wrap">
          {transitions.filter(t => t.to_status !== 'cancelled' && !(isDraft && t.to_status === 'confirmed')).map(t => (
            <button key={t.to_status} onClick={() => doTransition(t.to_status)} disabled={saving}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
              → {t.to_status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {canCancel && !isCancelled && (
          <button onClick={() => setCancelOpen(true)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">
            Cancel Order
          </button>
        )}

        <button onClick={() => router.back()} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Back</button>
      </div>

      {/* Cancel reason banner */}
      {isCancelled && order.cancel_reason && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-600">
          <span className="font-semibold">{order.cancel_reason_type?.replace(/_/g, ' ')}: </span>{order.cancel_reason}
        </div>
      )}

      {/* Cancel modal */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCancelOpen(false)} />
          <div className="relative rounded-xl bg-white p-6 shadow-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Cancel Order</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Reason type</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={cancelForm.reason_type} onChange={e => setCancelForm(p => ({ ...p, reason_type: e.target.value }))}>
                {CANCEL_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Reason</label>
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3}
                value={cancelForm.reason} onChange={e => setCancelForm(p => ({ ...p, reason: e.target.value }))} placeholder="Why is this order being cancelled?" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={doCancel} disabled={saving || !cancelForm.reason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {partner && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Customer</p>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                  {(partner.company_name||partner.name||'?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{partner.company_name||partner.name}</div>
                  {partner.company_name && <div className="text-xs text-slate-400">{partner.name}</div>}
                  <div className="text-xs text-slate-400 mt-0.5">{partner.email} · {partner.phone}</div>
                  {partner.vat_number && <div className="text-xs text-slate-400">VAT: {partner.vat_number}</div>}
                </div>
              </div>
            </div>
          )}

          {asset && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Vehicle</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {[['Make',asset.make],['Model',asset.model],['Year',asset.year],['VIN',asset.vin||'—'],['Type',asset.vehicle_type],['Status',asset.status]].map(([l,v]) => (
                  <div key={l}><span className="text-xs text-slate-400 block">{l}</span><span className={l==='Status'?'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600':'font-semibold'}>{v}</span></div>
                ))}
              </div>
              {costs.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cost breakdown</p>
                  <div className="space-y-1">
                    {costs.map((c: any) => (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="text-slate-500 capitalize">{c.category}{c.note?` — ${c.note}`:''}</span>
                        <span className="font-semibold text-slate-700">€{(c.amount??0).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold border-t border-slate-100 pt-1 mt-1">
                      <span className="text-slate-600">Total costs</span>
                      <span className="text-slate-800">€{totalCosts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Financials</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Sale price</span><span className="font-semibold text-slate-800">{order.sale_price?`€${order.sale_price.toLocaleString()}`:'—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total costs</span><span className="font-semibold text-slate-700">€{totalCosts.toLocaleString()}</span></div>
              {margin !== null && (
                <div className={`flex justify-between text-sm font-bold border-t border-slate-100 pt-3 ${margin>=0?'text-emerald-600':'text-red-600'}`}>
                  <span>Margin</span><span>€{margin.toLocaleString()}</span>
                </div>
              )}
              {order.aanbetaling_pct > 0 && (
                <div className="flex justify-between text-sm"><span className="text-slate-500">Deposit</span><span className="text-slate-700">{order.aanbetaling_pct}%</span></div>
              )}
              <div className="flex justify-between text-sm"><span className="text-slate-500">Type</span><span className="text-slate-700 capitalize">{order.type||'—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">VAT scheme</span><span className="text-slate-700">{order.vat_scheme||'—'}</span></div>
              {order.btw_regime && (
                <div className="flex justify-between text-sm"><span className="text-slate-500">BTW regime</span><span className="text-slate-700 capitalize">{order.btw_regime?.replace(/_/g, ' ')}</span></div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Dates</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="text-slate-700">{new Date(order.created_at).toLocaleDateString()}</span></div>
              {order.delivery_date && <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="text-slate-700">{new Date(order.delivery_date).toLocaleDateString()}</span></div>}
              {quotation && <div className="flex justify-between"><span className="text-slate-500">From quote</span><span className="font-mono text-xs text-slate-600">{quotation.quote_number}</span></div>}
            </div>
          </div>
          {order.delivery_terms && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Delivery Terms</p>
              <p className="text-sm text-slate-600">{order.delivery_terms}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
