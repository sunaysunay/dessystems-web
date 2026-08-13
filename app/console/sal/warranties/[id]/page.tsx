'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const SC: Record<string,string> = {
  active:'bg-emerald-100 text-emerald-700', claimed:'bg-amber-100 text-amber-700',
  expired:'bg-slate-100 text-slate-400', voided:'bg-red-100 text-red-600',
};
const CC: Record<string,string> = {
  submitted:'bg-blue-100 text-blue-700', under_review:'bg-amber-100 text-amber-700',
  approved:'bg-emerald-100 text-emerald-700', rejected:'bg-red-100 text-red-600',
  resolved:'bg-slate-100 text-slate-500',
};

export default function SA022Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [wr, setWr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimDesc, setClaimDesc] = useState('');
  const [claimCost, setClaimCost] = useState('');
  const [saving, setSaving] = useState(false);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/sal/warranties/${id}`).then(r => r.json());
    setWr(j.warranty ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function submitClaim() {
    if (!claimDesc.trim()) { showToast('Description required'); return; }
    setSaving(true);
    const res = await fetch(`/api/bop/sal/warranties/${id}/claims`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: claimDesc, cost_estimate: claimCost ? parseFloat(claimCost) : null, claim_count: wr?.claim_count ?? 0 }),
    }).then(r => r.json());
    if (res.error) showToast(res.error);
    else { showToast('Claim submitted'); setClaimOpen(false); setClaimDesc(''); setClaimCost(''); }
    setSaving(false);
    void load();
  }

  async function voidWarranty() {
    await fetch(`/api/bop/sal/warranties/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'voided' }),
    });
    showToast('Warranty voided');
    void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!wr) return <div className="p-8 text-slate-400">Warranty not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const partner = wr.mdm_business_partners;
  const order = wr.sal_orders;
  const claims = wr.sal_warranty_claims ?? [];
  const daysLeft = wr.expires_at ? Math.ceil((new Date(wr.expires_at).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <ScreenHeader title={wr.warranty_number ?? 'Warranty'} description="SA022 — Warranty Detail + Claims" />
        <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600">Back</button>
      </div>

      {/* Header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${SC[wr.status]??'bg-slate-100 text-slate-500'}`}>{wr.status}</span>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 capitalize">{wr.warranty_type}</span>
        {partner && <span className="text-xs text-slate-500">{partner.company_name ?? partner.name}</span>}
        {order && (
          <button onClick={() => router.push(`/console/sal/orders/${order.id}`)}
            className="text-xs text-blue-600 hover:underline">Order: {order.order_number}</button>
        )}
      </div>

      {/* Coverage info */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Starts</p>
          <p className="text-sm font-semibold text-slate-700">{wr.starts_at ? new Date(wr.starts_at).toLocaleDateString('nl-NL') : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expires</p>
          <p className="text-sm font-semibold text-slate-700">{wr.expires_at ? new Date(wr.expires_at).toLocaleDateString('nl-NL') : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Term</p>
          <p className="text-sm font-semibold text-slate-700">{wr.term_months} months</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Days Left</p>
          <p className={`text-sm font-semibold ${daysLeft != null && daysLeft <= 30 ? 'text-amber-600' : 'text-slate-700'}`}>
            {daysLeft != null ? (daysLeft > 0 ? daysLeft : 'Expired') : '—'}
          </p>
        </div>
      </div>

      {wr.coverage_notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Coverage Notes</p>
          <p className="text-sm text-slate-600">{wr.coverage_notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {wr.status === 'active' && (
          <>
            <button onClick={() => setClaimOpen(true)}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
              + File Claim
            </button>
            <button onClick={() => { void voidWarranty(); }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50">
              Void Warranty
            </button>
          </>
        )}
        {wr.status === 'claimed' && (
          <button onClick={() => setClaimOpen(true)}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            + Additional Claim
          </button>
        )}
      </div>

      {/* Claims list */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Claims ({claims.length})</p>
        {claims.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No claims filed</div>
        ) : (
          <div className="space-y-2">
            {claims.map((c: any) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-slate-400">{c.claim_number}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${CC[c.status]??'bg-slate-100 text-slate-500'}`}>{c.status?.replace(/_/g,' ')}</span>
                  </div>
                  <span className="text-xs text-slate-400">{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('nl-NL') : ''}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{c.description}</p>
                {c.cost_estimate && <p className="mt-1 text-xs text-slate-400">Est. cost: €{Number(c.cost_estimate).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>}
                {c.resolution && <p className="mt-1 text-xs text-emerald-600">Resolution: {c.resolution}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New claim modal */}
      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setClaimOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-bold text-slate-900">File Warranty Claim</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={claimDesc} onChange={e => setClaimDesc(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" placeholder="Describe the issue..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estimated cost (€)</label>
                <input type="number" value={claimCost} onChange={e => setClaimCost(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setClaimOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void submitClaim(); }} disabled={saving || !claimDesc.trim()}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                {saving ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
