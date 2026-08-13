'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const STATUSES = ['draft','sent','partial','paid','overdue','cancelled'] as const;

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-500',
  sent:      'bg-blue-100 text-blue-700',
  partial:   'bg-amber-100 text-amber-700',
  paid:      'bg-emerald-100 text-emerald-700',
  overdue:   'bg-red-100 text-red-600',
  cancelled: 'bg-slate-100 text-slate-400',
};

const TAX_RATES = [0, 9, 21];

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
}

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price: 0, tax_rate: 21 };

function calcLine(l: LineItem) {
  const net = l.qty * l.unit_price;
  const tax = net * (l.tax_rate / 100);
  return { net, tax, gross: net + tax };
}

function calcTotals(lines: LineItem[]) {
  return lines.reduce(
    (acc, l) => { const c = calcLine(l); return { net: acc.net + c.net, tax: acc.tax + c.tax, gross: acc.gross + c.gross }; },
    { net: 0, tax: 0, gross: 0 }
  );
}

function daysOverdue(due_date: string) {
  const diff = Math.floor((Date.now() - new Date(due_date).getTime()) / 86400000);
  return diff;
}

export default function FI001Page() {
  const { unit } = useScope();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [payDrawer, setPayDrawer] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const j = await fetch(`/api/bop/fin/invoices?${params}`).then(r => r.json());
    setInvoices(j.invoices ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetch('/api/bop/md/partners?limit=200').then(r => r.json()).then(j => setPartners(j.partners ?? []));
    void fetch('/api/bop/sal/quotations?status=accepted&limit=100').then(r => r.json()).then(j => setQuotes(j.quotations ?? []));
  }, []);

  function openNew() {
    setEditing(null);
    const due = new Date(); due.setDate(due.getDate() + 30);
    setForm({
      partner_id: '', quotation_id: '', due_date: due.toISOString().split('T')[0],
      notes: '', lines: [{ ...EMPTY_LINE }], tenant_id: unit.id,
    });
    setDrawerOpen(true);
  }

  function openEdit(inv: any) {
    setEditing(inv);
    setForm({
      partner_id: inv.partner_id ?? '',
      quotation_id: inv.quotation_id ?? '',
      due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
      notes: inv.notes ?? '',
      lines: inv.lines ?? [{ ...EMPTY_LINE }],
      status: inv.status,
    });
    setDrawerOpen(true);
  }

  function updateLine(i: number, k: keyof LineItem, v: any) {
    setForm((p: any) => {
      const lines = [...p.lines];
      lines[i] = { ...lines[i], [k]: k === 'description' ? v : parseFloat(v) || 0 };
      return { ...p, lines };
    });
  }

  function addLine() { setForm((p: any) => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] })); }
  function removeLine(i: number) { setForm((p: any) => ({ ...p, lines: p.lines.filter((_: any, idx: number) => idx !== i) })); }

  // Import lines from accepted quotation
  function importFromQuote(qid: string) {
    const q = quotes.find(x => x.id === qid);
    if (!q) return;
    f('quotation_id', qid);
    if (q.partner_id) f('partner_id', q.partner_id);
    if (q.lines) f('lines', q.lines);
  }

  async function save() {
    setSaving(true);
    const totals = calcTotals(form.lines);
    const payload = { ...form, ...totals, tenant_id: unit.id };
    if (editing) {
      await fetch(`/api/bop/fin/invoices/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      showToast('Invoice updated');
    } else {
      await fetch('/api/bop/fin/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      showToast('Invoice created');
    }
    setSaving(false);
    setDrawerOpen(false);
    void load();
  }

  async function quickStatus(id: string, status: string) {
    await fetch(`/api/bop/fin/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    showToast(`Invoice marked ${status}`);
  }

  async function logPayment() {
    if (!payDrawer || !payAmount) return;
    await fetch('/api/bop/fin/payments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id: payDrawer.id, amount: parseFloat(payAmount),
        payment_date: new Date().toISOString().split('T')[0],
        tenant_id: unit.id,
      }),
    });
    setPayDrawer(null);
    setPayAmount('');
    showToast('Payment logged');
    void load();
  }

  // KPIs
  const totalAR    = invoices.filter(i => !['paid','cancelled'].includes(i.status)).reduce((s, i) => s + (i.gross ?? 0), 0);
  const overdueAR  = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.gross ?? 0), 0);
  const paidMonth  = invoices.filter(i => i.status === 'paid' && i.updated_at?.startsWith(new Date().toISOString().slice(0,7))).reduce((s, i) => s + (i.gross ?? 0), 0);
  const openCount  = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).length;

  const totals = calcTotals(form.lines ?? []);

  return (
    <div>
      <ScreenHeader title="Invoices AR" description="Accounts receivable — issue and track customer invoices — FI001/FI002" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Open AR</p>
          <p className="text-2xl font-bold text-slate-800">€{totalAR.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overdue</p>
          <p className="text-2xl font-bold text-red-600">€{overdueAR.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid This Month</p>
          <p className="text-2xl font-bold text-emerald-600">€{paidMonth.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Open Invoices</p>
          <p className="text-2xl font-bold text-blue-600">{openCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
              statusFilter === s ? STATUS_COLOR[s] + ' border-current' : 'border-slate-200 text-slate-400 hover:border-slate-300'
            }`}>{s}</button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{invoices.length} invoices</span>
        <button onClick={openNew}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + New Invoice
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Kind</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">VAT</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  No invoices yet — click <strong>+ New Invoice</strong> to get started
                </td></tr>
              ) : invoices.map(inv => {
                const overdueDays = inv.due_date && inv.status !== 'paid' ? daysOverdue(inv.due_date) : 0;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(inv)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{inv.invoice_number ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {inv.mdm_business_partners?.name ?? inv.mdm_business_partners?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {inv.invoice_kind ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          inv.invoice_kind === 'deposit' ? 'bg-violet-50 text-violet-600' :
                          inv.invoice_kind === 'credit_note' ? 'bg-orange-50 text-orange-600' :
                          'bg-slate-50 text-slate-500'
                        }`}>{inv.invoice_kind === 'credit_note' ? 'Credit' : inv.invoice_kind}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{inv.sal_orders?.order_number ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-500">€{Number(inv.net ?? 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-slate-400">€{Number(inv.tax ?? 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">€{Number(inv.gross ?? 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-xs">
                      {inv.due_date ? (
                        <span className={overdueDays > 0 && inv.status !== 'paid' ? 'font-semibold text-red-500' : 'text-slate-400'}>
                          {new Date(inv.due_date).toLocaleDateString('nl-NL')}
                          {overdueDays > 0 && inv.status !== 'paid' && <span className="ml-1">({overdueDays}d)</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[inv.status]}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {inv.status === 'draft' && (
                          <button onClick={() => { void quickStatus(inv.id, 'sent'); }}
                            className="rounded px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">Send</button>
                        )}
                        {['sent','partial','overdue'].includes(inv.status) && (
                          <button onClick={() => { setPayDrawer(inv); setPayAmount(String(inv.gross ?? '')); }}
                            className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                            + Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment modal */}
      {payDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPayDrawer(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-slate-900">Log Payment</h3>
            <p className="mb-4 text-xs text-slate-400">{payDrawer.invoice_number} — {payDrawer.mdm_business_partners?.name ?? payDrawer.mdm_business_partners?.company_name}</p>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount received (€)</label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setPayDrawer(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void logPayment(); }}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editing ? `Edit ${editing.invoice_number ?? 'Invoice'}` : 'New Invoice'}</h2>
                <p className="text-xs text-slate-400">FI001/FI002 — Invoices AR</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Import from quotation */}
              {!editing && quotes.length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="mb-2 text-xs font-semibold text-blue-700">Import from accepted quotation</p>
                  <BopSelect value="" onChange={v => importFromQuote(v)}
                    options={[{value:'',label:'— Select quotation —'}, ...quotes.map(q => ({value:q.id, label:`${q.quote_number} — ${q.mdm_business_partners?.name ?? q.mdm_business_partners?.company_name} — €${Number(q.gross ?? 0).toLocaleString('nl-NL')}`}))]}
                    placeholder="— Select quotation —" size="md" />
                </div>
              )}

              {/* Header fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
                  <BopSelect value={form.partner_id} onChange={v => f('partner_id', v)}
                    options={[{value:'',label:'— Select customer —'}, ...partners.map(p => ({value:p.id, label:p.name || p.company_name}))]}
                    placeholder="— Select customer —" size="md" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
                </div>
                {editing && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                    <BopSelect value={form.status} onChange={v => f('status', v)}
                      options={STATUSES.map(s => ({value:s, label:s.charAt(0).toUpperCase()+s.slice(1)}))}
                      placeholder="Status" size="md" />
                  </div>
                )}
              </div>

              {/* Line items */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Line Items</p>
                <div className="space-y-2">
                  {(form.lines ?? []).map((line: LineItem, i: number) => {
                    const c = calcLine(line);
                    return (
                      <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-2">
                          <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                            placeholder="Description…"
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none" />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">Qty</label>
                            <input type="number" value={line.qty} onChange={e => updateLine(i, 'qty', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">Unit Price €</label>
                            <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">VAT %</label>
                            <BopSelect value={String(line.tax_rate)} onChange={v => updateLine(i, 'tax_rate', v)}
                              options={TAX_RATES.map(r => ({value:String(r), label:`${r}%`}))}
                              placeholder="VAT" size="sm" />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="block text-[10px] text-slate-400 mb-0.5">Total</label>
                            <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700">
                              €{c.gross.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {(form.lines?.length ?? 0) > 1 && (
                                <button onClick={() => removeLine(i)} className="ml-1 text-red-400 hover:text-red-600 text-xs">✕</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={addLine}
                    className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600">
                    + Add Line
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal (excl. VAT)</span>
                    <span>€{totals.net.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>VAT</span>
                    <span>€{totals.tax.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                    <span>Total (incl. VAT)</span>
                    <span>€{totals.gross.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
                  rows={3} placeholder="Payment terms, bank details, notes…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving || !form.partner_id}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
