'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const COST_CATS = ['purchase','transport','reconditioning','customs','inspection','marketing','other'];

interface CostRow { category: string; amount: string; }

export default function PR004Page() {
  const [salePrice, setSalePrice] = useState('');
  const [costs, setCosts] = useState<CostRow[]>([{ category:'purchase', amount:'' }]);

  function addRow() { setCosts(p => [...p, { category:'other', amount:'' }]); }
  function removeRow(i: number) { setCosts(p => p.filter((_,j) => j !== i)); }
  function updateRow(i: number, key: keyof CostRow, val: string) {
    setCosts(p => p.map((r,j) => j===i ? {...r,[key]:val} : r));
  }

  const totalCosts = costs.reduce((s, r) => s + (parseFloat(r.amount)||0), 0);
  const salePriceNum = parseFloat(salePrice) || 0;
  const grossMargin = salePriceNum - totalCosts;
  const grossPct = salePriceNum > 0 ? (grossMargin / salePriceNum) * 100 : 0;
  const isPositive = grossMargin >= 0;

  const byCat = COST_CATS.map(cat => ({
    cat,
    total: costs.filter(r => r.category===cat).reduce((s,r) => s + (parseFloat(r.amount)||0), 0),
  })).filter(x => x.total > 0);

  return (
    <div>
      <ScreenHeader title="Margin Calculator" description="PR004 — Calculate gross margin per vehicle deal"/>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Sale Price</p>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">€</span>
              <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)}
                placeholder="0" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold text-slate-800 focus:border-blue-400 focus:outline-none"/>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cost Items</p>
              <button onClick={addRow} className="text-xs text-blue-600 hover:underline">+ Add row</button>
            </div>
            <div className="space-y-2">
              {costs.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={row.category} onChange={e => updateRow(i,'category',e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none flex-shrink-0">
                    {COST_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-slate-400 text-sm">€</span>
                    <input type="number" value={row.amount} onChange={e => updateRow(i,'amount',e.target.value)}
                      placeholder="0" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
                  </div>
                  {costs.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-400 text-xs px-1">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
              <span className="text-slate-600">Total costs</span>
              <span className="text-slate-800">€{totalCosts.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl border-2 p-5 ${isPositive ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Result</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sale price</span><span className="font-semibold">€{salePriceNum.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total costs</span><span className="font-semibold">€{totalCosts.toLocaleString()}</span></div>
              <div className={`flex justify-between text-xl font-bold border-t pt-3 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                <span>Margin</span><span>€{grossMargin.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                <span>Margin %</span><span>{grossPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {byCat.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Cost breakdown</p>
              <div className="space-y-2">
                {byCat.map(x => (
                  <div key={x.cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-500 capitalize">{x.cat}</span>
                      <span className="font-semibold text-slate-700">€{x.total.toLocaleString()} ({totalCosts>0?((x.total/totalCosts)*100).toFixed(0):0}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{width:`${totalCosts>0?(x.total/totalCosts)*100:0}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">Benchmarks</p>
            <p>Good margin: &gt;15%</p>
            <p>Target: 20–30%</p>
            <p>Break-even: 0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
