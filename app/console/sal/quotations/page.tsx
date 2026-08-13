'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const STATUSES = ['draft','sent','accepted','rejected','expired'] as const;

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-500',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-500',
  expired:  'bg-amber-100 text-amber-700',
};

const TAX_RATES = [0, 9, 21];

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
}

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price: 0, tax_rate: 21 };

const EMPTY_FORM = {
  partner_id: '',
  asset_id: '',
  valid_until: '',
  notes: '',
  lines: [{ ...EMPTY_LINE }] as LineItem[],
  status: 'draft',
};

function calcLine(l: LineItem) {
  const net = l.qty * l.unit_price;
  const tax = net * (l.tax_rate / 100);
  return { net, tax, gross: net + tax };
}

function calcTotals(lines: LineItem[]) {
  return lines.reduce(
    (acc, l) => {
      const c = calcLine(l);
      return { net: acc.net + c.net, tax: acc.tax + c.tax, gross: acc.gross + c.gross };
    },
    { net: 0, tax: 0, gross: 0 }
  );
}

export default function SA001Page() {
  const { unit } = useScope();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const j = await fetch(`/api/bop/sal/quotations?${params}`).then(r => r.json());
    setQuotes(j.quotations ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetch('/api/bop/md/partners?limit=200').then(r => r.json()).then(j => setPartners(j.partners ?? []));
    void fetch('/api/bop/ast/assets?limit=200').then(r => r.json()).then(j => setAssets((j.assets ?? []).filter((a: any) => a.status !== 'sold')));
  }, []);

  function openNew() {
    setEditing(null);
    const d = new Date(); d.setDate(d.getDate() + 30);
    setForm({ ...EMPTY_FORM, valid_until: d.toISOString().split('T')[0], lines: [{ ...EMPTY_LINE }], tenant_id: unit.id });
    setDrawerOpen(true);
  }

  function openEdit(q: any) {
    setEditing(q);
    setForm({
      partner_id: q.partner_id ?? '',
      asset_id: q.asset_id ?? '',
      valid_until: q.valid_until ? q.valid_until.split('T')[0] : '',
      notes: q.notes ?? '',
      lines: q.lines ?? [{ ...EMPTY_LINE }],
      status: q.status,
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
  function removeLine(i: number) {
    setForm((p: any) => ({ ...p, lines: p.lines.filter((_: any, idx: number) => idx !== i) }));
  }

  async function save() {
    setSaving(true);
    const totals = calcTotals(form.lines);
    const payload = { ...form, ...totals, tenant_id: unit.id };
    if (editing) {
      await fetch(`/api/bop/sal/quotations/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      showToast('Quotation updated');
    } else {
      await fetch('/api/bop/sal/quotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      showToast('Quotation created');
    }
    setSaving(false);
    setDrawerOpen(false);
    void load();
  }

  async function quickStatus(id: string, status: string) {
    await fetch(`/api/bop/sal/quotations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    showToast(`Marked ${status}`);
  }

  // KPIs
  const total   = quotes.length;
  const open    = quotes.filter(q => q.status === 'sent').length;
  const won     = quotes.filter(q => q.status === 'accepted').length;
  const pipeline = quotes.filter(q => ['draft','sent'].includes(q.status))
    .reduce((s, q) => s + (q.gross ?? 0), 0);

  const totals = calcTotals(form.lines);

  return (
    <div>
      <ScreenHeader title="Quotations" description="Create and track sales quotations — SA001/SA002" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Open</p>
          <p className="text-2xl font-bold text-blue-600">{open}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Won</p>
          <p className="text-2xl font-bold text-emerald-600">{won}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pipeline Value</p>
          <p className="text-2xl font-bold text-slate-800">€{pipeline.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</p>
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
        <span className="ml-auto text-xs text-slate-400">{quotes.length} quotes</span>
        <button onClick={openNew}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + New Quotation
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
                <th className="px-4 py-3 text-left">Quote #</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Valid Until</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {quotes.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  No quotations yet — click <strong>+ New Quotation</strong> to get started
                </td></tr>
              ) : quotes.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(q)}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{q.quote_number ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {q.mdm_business_partners?.name ?? q.mdm_business_partners?.company_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {q.ast_assets ? `${q.ast_assets.make} ${q.ast_assets.model} ${q.ast_assets.year}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">€{Number(q.net ?? 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-slate-400">€{Number(q.tax ?? 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">€{Number(q.gross ?? 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {q.valid_until ? new Date(q.valid_until).toLocaleDateString('nl-NL') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[q.status]}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {q.status === 'draft' && (
                        <button onClick={() => { void quickStatus(q.id, 'sent'); }}
                          className="rounded px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">Send</button>
                      )}
                      {q.status === 'sent' && (<>
                        <button onClick={() => { void quickStatus(q.id, 'accepted'); }}
                          className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100">Won</button>
                        <button onClick={() => { void quickStatus(q.id, 'rejected'); }}
                          className="rounded px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100">Lost</button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editing ? `Edit ${editing.quote_number ?? 'Quotation'}` : 'New Quotation'}</h2>
                <p className="text-xs text-slate-400">SA001/SA002 — Quotation Manager</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Header fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
                  <BopSelect value={form.partner_id} onChange={v => f('partner_id', v)}
                    options={[{value:'',label:'— Select customer —'}, ...partners.map(p => ({value:p.id, label:p.name || p.company_name}))]}
                    placeholder="— Select customer —" size="md" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle (optional)</label>
                  <BopSelect value={form.asset_id} onChange={v => f('asset_id', v)}
                    options={[{value:'',label:'— No vehicle linked —'}, ...assets.map(a => ({value:a.id, label:`${a.make} ${a.model} ${a.year} — €${Number(a.asking_price ?? 0).toLocaleString('nl-NL')}`}))]}
                    placeholder="— No vehicle linked —" size="md" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={e => f('valid_until', e.target.value)}
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
                  {form.lines.map((line: LineItem, i: number) => {
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
                              {form.lines.length > 1 && (
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
                  rows={3} placeholder="Internal notes or terms…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving || !form.partner_id}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
