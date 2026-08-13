'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import EmailComposer from '@/components/EmailComposer';

const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', sent:'bg-blue-100 text-blue-700',
  viewed:'bg-cyan-100 text-cyan-700', accepted:'bg-emerald-100 text-emerald-700',
  declined:'bg-red-100 text-red-600', expired:'bg-orange-100 text-orange-700',
  cancelled:'bg-slate-200 text-slate-500',
};

export default function SA002Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [transitions, setTransitions] = useState<{ to_status: string; guard: string | null }[]>([]);
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, tRes] = await Promise.all([
      fetch(`/api/bop/sal/quotations/${id}`).then(r => r.json()),
      fetch(`/api/bop/sal/quotations/${id}/transition`).then(r => r.json()).catch(() => ({ transitions: [] })),
    ]);
    setQuotation(qRes.quotation ?? null);
    setTransitions(tRes.transitions ?? []);
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function doTransition(to_status: string) {
    setSaving(true);
    await fetch(`/api/bop/sal/quotations/${id}/transition`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_status }),
    });
    showToast(`Status → ${to_status}`); setSaving(false); void load();
  }

  async function doSend() {
    setSaving(true);
    const r = await fetch(`/api/bop/sal/quotations/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json());
    if (r.error) { showToast(r.error); setSaving(false); return; }
    showToast('Quotation sent to customer'); setSaving(false); void load();
  }

  async function doNewVersion() {
    setSaving(true);
    const r = await fetch(`/api/bop/sal/quotations/${id}/new-version`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json());
    if (r.error) { showToast(r.error); setSaving(false); return; }
    showToast('New version created'); setSaving(false);
    if (r.new_quotation_id) router.push(`/console/sal/quotations/${r.new_quotation_id}`);
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!quotation) return <div className="p-8 text-slate-400">Quotation not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const partner = quotation.mdm_business_partners;
  const asset = quotation.ast_assets;
  const lines = Array.isArray(quotation.lines) ? quotation.lines : [];
  const isMarge = quotation.btw_regime === 'marge';
  const subtotal = lines.reduce((s: number, l: any) => s + (l.qty ?? 1) * (l.unit_price ?? 0), 0);
  const vat = isMarge ? 0 : subtotal * 0.21;
  const total = subtotal + vat;
  const isDraft = quotation.status === 'draft';
  const isAccepted = quotation.status === 'accepted';

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title={quotation.quote_number ?? 'Quotation'} description={`SA002 — Quotation Detail · ${quotation.type ?? 'sale'}`}/>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[quotation.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {quotation.status}
        </span>
        {quotation.version > 1 && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600">v{quotation.version}</span>
        )}
        {quotation.btw_regime && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isMarge ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
            {isMarge ? 'Marge' : 'BTW belast'}
          </span>
        )}

        {/* Action buttons based on status */}
        {isDraft && (
          <button onClick={doSend} disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            Send to Customer
          </button>
        )}
        {(quotation.status === 'sent' || quotation.status === 'viewed' || quotation.status === 'declined') && (
          <button onClick={doNewVersion} disabled={saving}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            New Version
          </button>
        )}
        {isAccepted && (
          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            Customer Accepted
          </span>
        )}

        {/* Validated transitions */}
        <div className="flex gap-1.5 flex-wrap">
          {transitions.filter(t => !['sent'].includes(t.to_status)).map(t => (
            <button key={t.to_status} onClick={() => doTransition(t.to_status)} disabled={saving}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
              → {t.to_status}
            </button>
          ))}
        </div>

        {partner && (
          <button onClick={() => setShowComposer(true)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            ✉ Email customer
          </button>
        )}
        <button onClick={() => router.back()} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Back</button>
      </div>

      {/* Snapshot banner for non-draft */}
      {quotation.snapshot && !isDraft && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2 text-xs text-blue-600">
          Snapshot frozen at {new Date(quotation.snapshot.frozen_at).toLocaleString()} — values below reflect the sent version.
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
                  <div className="text-xs text-slate-400 mt-0.5">{partner.email} · {partner.phone}</div>
                </div>
              </div>
            </div>
          )}

          {asset && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Vehicle</p>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800">{asset.make} {asset.model} {asset.year}</div>
                  <div className="text-xs text-slate-400">{asset.vehicle_type}</div>
                </div>
                <span className="text-lg font-bold text-slate-800">{asset.asking_price ? `€${Number(asset.asking_price).toLocaleString()}` : '—'}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quote Lines</div>
            {lines.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No line items</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs font-semibold uppercase text-slate-400 border-b border-slate-100">
                  <tr><th className="px-5 py-2 text-left">Description</th><th className="px-5 py-2 text-right">Qty</th><th className="px-5 py-2 text-right">Unit price</th><th className="px-5 py-2 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="px-5 py-3 text-slate-700">{l.description}</td>
                      <td className="px-5 py-3 text-right text-slate-500">{l.qty ?? 1}</td>
                      <td className="px-5 py-3 text-right text-slate-500">€{(l.unit_price ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">€{((l.qty??1)*(l.unit_price??0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Totals</p>
            <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="font-medium">€{subtotal.toLocaleString()}</span></div>
            {isMarge ? (
              <div className="flex justify-between text-amber-600"><span>Marge regime</span><span className="text-[10px]">No VAT shown</span></div>
            ) : (
              <div className="flex justify-between"><span className="text-slate-400">VAT 21%</span><span className="font-medium">€{vat.toLocaleString()}</span></div>
            )}
            <div className="flex justify-between font-bold border-t border-slate-100 pt-3"><span>Total</span><span className="text-slate-800">€{total.toLocaleString()}</span></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Details</p>
            {[
              ['Type', quotation.type],
              ['BTW regime', isMarge ? 'Marge' : 'BTW belast'],
              ['VAT scheme', quotation.vat_scheme],
              ['Version', String(quotation.version ?? 1)],
              ['Valid until', quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : '—'],
              ['Created', new Date(quotation.created_at).toLocaleDateString()],
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="font-medium text-slate-700 capitalize">{v||'—'}</span></div>
            ))}
          </div>
        </div>
      </div>

      {showComposer && partner && (
        <EmailComposer
          contextType="customer" recordId={partner.id} tenantId={quotation.tenant_id}
          onClose={() => setShowComposer(false)}
          onSent={() => { setShowComposer(false); showToast('Email sent'); void load(); }}
        />
      )}
    </div>
  );
}
