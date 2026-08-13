'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import EmailComposer from '@/components/EmailComposer';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/lib/comm/resolve-locale';

const INVOICE_CATEGORIES = ['invoice.invoice', 'invoice.credit_note', 'invoice.reminder', 'invoice.refund'] as const;

const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', sent:'bg-blue-100 text-blue-700',
  partial:'bg-amber-100 text-amber-700', paid:'bg-emerald-100 text-emerald-700',
  overdue:'bg-red-100 text-red-600', cancelled:'bg-slate-100 text-slate-400',
};
const STATUSES = ['draft','sent','partial','paid','overdue','cancelled'];

export default function FI002Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [payForm, setPayForm] = useState({ amount:'', method:'bank', note:'' });
  const [payOpen, setPayOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendCategory, setSendCategory] = useState<string>(INVOICE_CATEGORIES[0]);
  const [sendLocale, setSendLocale] = useState<string>('');
  const [sending, setSending] = useState(false);
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/fin/invoices/${id}`).then(r => r.json());
    setInvoice(j.invoice ?? null);
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function moveStatus(status: string) {
    await fetch(`/api/bop/fin/invoices/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
    showToast('Status updated'); void load();
  }

  async function sendEmail() {
    if (!invoice?.tenant_id || !sendCategory) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bop/fin/invoices/${id}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: invoice.tenant_id, category: sendCategory, ...(sendLocale ? { locale: sendLocale } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      showToast(`Sent (${data.locale})`);
      setSendOpen(false);
      void load();
    } catch (err: any) {
      showToast(err.message ?? 'Send failed');
    } finally {
      setSending(false);
    }
  }

  async function recordPayment() {
    if (!payForm.amount) return;
    setSaving(true);
    await fetch('/api/bop/fin/payments', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ invoice_id: id, amount: parseFloat(payForm.amount), method: payForm.method, note: payForm.note, paid_at: new Date().toISOString() }),
    });
    showToast('Payment recorded'); setSaving(false); setPayOpen(false); setPayForm({ amount:'', method:'bank', note:'' }); void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!invoice) return <div className="p-8 text-slate-400">Invoice not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const partner = invoice.mdm_business_partners;
  const payments = invoice.fin_payments ?? [];
  const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  const balance = (invoice.gross ?? 0) - totalPaid;

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title={invoice.invoice_number ?? 'Invoice'} description={`FI002 — Invoice Detail · ${invoice.type ?? 'AR'}`}/>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[invoice.status]??'bg-slate-100 text-slate-500'}`}>{invoice.status}</span>
        {partner && (
          <button onClick={() => setShowComposer(true)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            Email invoice
          </button>
        )}
        <div className="relative">
          <button onClick={() => setSendOpen(!sendOpen)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            Send Email
          </button>
          {sendOpen && (
            <div className="absolute left-0 top-full mt-1 z-40 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Category</label>
                <select value={sendCategory} onChange={e => setSendCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none">
                  {INVOICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Locale override</label>
                <select value={sendLocale} onChange={e => setSendLocale(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none">
                  <option value="">Auto-detect</option>
                  {SUPPORTED_LOCALES.map(l => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setSendOpen(false)} className="text-xs text-slate-400 px-2 py-1">Cancel</button>
                <button onClick={() => { void sendEmail(); }} disabled={sending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{sending ? '...' : 'Send'}</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.filter(s => s !== invoice.status).map(s => (
            <button key={s} onClick={() => { void moveStatus(s); }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              → {s}
            </button>
          ))}
        </div>
        <button onClick={() => router.back()} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Back</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {partner && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Bill To</p>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                  {(partner.company_name||partner.name||'?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{partner.company_name||partner.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{partner.email}</div>
                  {partner.iban && <div className="text-xs text-slate-400">IBAN: {partner.iban}</div>}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Payments</div>
            {payments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No payments recorded</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
                  <tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Method</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Note</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p:any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-600">{p.method ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">€{(p.amount??0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{p.note||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {payOpen && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Amount (€) *</label>
                    <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({...p,amount:e.target.value}))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Method</label>
                    <select value={payForm.method} onChange={e => setPayForm(p => ({...p,method:e.target.value}))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {['bank','cash','card','paypal','andere'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <input value={payForm.note} onChange={e => setPayForm(p => ({...p,note:e.target.value}))} placeholder="Note (optional)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setPayOpen(false)} className="text-xs text-slate-400 px-3 py-1.5">Cancel</button>
                  <button onClick={() => { void recordPayment(); }} disabled={saving||!payForm.amount}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">{saving?'...':'Record'}</button>
                </div>
              </div>
            )}
            {!payOpen && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <div className="border-t border-slate-100 px-5 py-3">
                <button onClick={() => setPayOpen(true)} className="text-sm text-blue-600 hover:underline">+ Record payment</button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Amounts</p>
            {[['Net', invoice.amount],['VAT', invoice.vat_amount],['Gross', invoice.gross]].map(([l,v]) => (
              <div key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="font-medium">€{(v??0).toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between"><span className="text-slate-400">Paid</span><span className="font-medium text-emerald-600">€{totalPaid.toLocaleString()}</span></div>
            <div className={`flex justify-between font-bold border-t border-slate-100 pt-3 ${balance > 0 ? 'text-red-600':'text-emerald-600'}`}>
              <span>Balance</span><span>€{balance.toLocaleString()}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Details</p>
            {[['Due date', invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'],['Reference', invoice.reference||'—'],['VAT scheme', invoice.vat_scheme||'—'],['Created', new Date(invoice.created_at).toLocaleDateString()]].map(([l,v]) => (
              <div key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="font-medium text-slate-700">{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      {showComposer && partner && (
        <EmailComposer
          contextType="invoice" recordId={invoice.id} tenantId={invoice.tenant_id}
          onClose={() => setShowComposer(false)}
          onSent={() => { setShowComposer(false); showToast('✓ Email sent'); void load(); }}
        />
      )}
    </div>
  );
}
