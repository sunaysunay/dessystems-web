'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const METHOD_COLOR: Record<string,string> = {
  bank:'bg-blue-100 text-blue-700', cash:'bg-emerald-100 text-emerald-700',
  card:'bg-violet-100 text-violet-700', paypal:'bg-indigo-100 text-indigo-700', andere:'bg-slate-100 text-slate-500',
};

export default function FI004Page() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');

  useEffect(() => {
    void fetch('/api/bop/fin/payments').then(r => r.json()).then(j => {
      setPayments(j.payments ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = methodFilter ? payments.filter(p => p.method === methodFilter) : payments;
  const total = filtered.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  const byMethod = ['bank','cash','card','paypal','andere'].map(m => ({
    method: m,
    total: payments.filter(p => p.method === m).reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
    count: payments.filter(p => p.method === m).length,
  })).filter(x => x.count > 0);

  return (
    <div>
      <ScreenHeader title="Payment Tracking" description="FI002 — All payments received across invoices"/>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          {label:'Total received', value:`€${total.toLocaleString()}`, cls:'text-emerald-600'},
          {label:'Transactions', value: filtered.length, cls:'text-slate-800'},
          ...byMethod.slice(0,2).map(m => ({label: m.method, value:`€${m.total.toLocaleString()}`, cls:'text-slate-700'})),
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-400 mb-1 capitalize">{k.label}</div>
            <div className={`text-xl font-bold ${k.cls}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1">
          <button onClick={() => setMethodFilter('')} className={`rounded-full px-3 py-1 text-xs font-medium ${!methodFilter?'bg-slate-800 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
          {['bank','cash','card','paypal','andere'].map(m => (
            <button key={m} onClick={() => setMethodFilter(methodFilter===m?'':m)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${methodFilter===m?METHOD_COLOR[m]:'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{m}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} payments</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Note</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No payments found</td></tr>
              ) : filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.fin_invoices?.invoice_number ?? p.invoice_id?.slice(0,8) ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${METHOD_COLOR[p.method]??'bg-slate-100 text-slate-500'}`}>{p.method}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">€{(p.amount??0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{p.note||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
