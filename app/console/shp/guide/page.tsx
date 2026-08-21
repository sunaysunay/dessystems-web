'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenBadge';
import GuidedTour from '@/components/GuidedTour';

const MODULES = [
  { key: '1_masterdata',  label: 'Master Data',  icon: 'M', desc: 'Products, brands, and customer records' },
  { key: '2_procurement', label: 'Procurement',   icon: 'P', desc: 'Purchase orders, goods-in, supplier catalog' },
  { key: '3_warehouse',   label: 'Warehouse',     icon: 'W', desc: 'Inventory levels, reservations, adjustments' },
  { key: '4_sales',       label: 'Sales',          icon: 'S', desc: 'Order management and lifecycle' },
  { key: '5_shipping',    label: 'Shipping',       icon: 'T', desc: 'Fulfilment, picking, packing, labels' },
  { key: '6_finance',     label: 'Finance',        icon: 'F', desc: 'Invoices, credit notes, VAT/OSS, margin' },
  { key: '7_aftersales',  label: 'After-Sales',    icon: 'A', desc: 'Returns, refunds, inspections, claims' },
  { key: '8_compliance',  label: 'Compliance',     icon: 'C', desc: 'GDPR, GPSR registrations, eco fees' },
];

type GuideStep = {
  id: string;
  title: string;
  body: string;
  target_selector: string | null;
  doc_link: string | null;
  screen_path: string | null;
  step_order: number;
};

type ModuleData = {
  steps: GuideStep[];
  completed: boolean;
};

export default function ShopGuidePage() {
  const [data, setData] = useState<Record<string, ModuleData>>({});
  const [selected, setSelected] = useState(MODULES[0].key);
  const [loading, setLoading] = useState(true);
  const [tourModule, setTourModule] = useState<string | null>(null);

  useEffect(() => {
    const userId = 'admin';
    Promise.all(
      MODULES.map(m =>
        fetch(`/api/bop/shop/guide?module=SHP&submodule=${m.key}&user_id=${userId}`)
          .then(r => r.json())
          .then(j => [m.key, { steps: j.steps ?? [], completed: j.completed ?? false }] as const)
      )
    ).then(entries => {
      setData(Object.fromEntries(entries));
      setLoading(false);
    });
  }, []);

  const completedCount = Object.values(data).filter(d => d.completed).length;
  const totalSteps = Object.values(data).reduce((s, d) => s + d.steps.length, 0);
  const selectedData = data[selected];
  const selectedModule = MODULES.find(m => m.key === selected)!;

  return (
    <div className="p-6 space-y-5">
      <ScreenHeader />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Shop Operations Guide</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Click a module to view its steps. {completedCount}/{MODULES.length} modules completed &middot; {totalSteps} total steps
          </p>
        </div>
        <div className="flex gap-1 items-center flex-shrink-0">
          {MODULES.map(m => (
            <div
              key={m.key}
              className={`w-5 h-1.5 rounded-full ${data[m.key]?.completed ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-600'}`}
              title={`${m.label}: ${data[m.key]?.completed ? 'completed' : 'not started'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Module list — left, sticky */}
        <div className="w-[260px] flex-shrink-0 sticky top-4 space-y-1">
          {MODULES.map(m => {
            const d = data[m.key];
            const isSelected = selected === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelected(m.key)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-all ${
                  isSelected
                    ? 'border-indigo-300 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[13px] font-semibold leading-tight ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {m.label}
                    </span>
                    <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{m.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {d?.completed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Completed" />
                    )}
                    <span className="text-[10px] text-slate-400">{d?.steps.length ?? 0}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step detail — right, scrolls independently */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-8 text-center">
              <p className="text-sm text-slate-400">Loading guide steps...</p>
            </div>
          ) : selectedData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{selectedModule.label}</h2>
                <button
                  onClick={() => setTourModule(selected)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  Start Interactive Tour
                </button>
              </div>

              {selectedData.steps.map((step, i) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{step.title}</h3>
                      <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{step.body}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {step.screen_path && (
                          <Link
                            href={step.screen_path}
                            className="text-[11px] text-indigo-500 hover:text-indigo-400 font-medium"
                          >
                            Open screen &rarr;
                          </Link>
                        )}
                        {step.doc_link && (
                          <Link
                            href={step.doc_link}
                            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            Documentation &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {selectedData.steps.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-sm text-slate-400">No guide steps configured for this module yet.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {tourModule && (
        <GuidedTour
          moduleCode="SHP"
          submodule={tourModule}
          forceStart={true}
          onClose={() => setTourModule(null)}
        />
      )}
    </div>
  );
}
