'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenBadge';
import GuidedTour from '@/components/GuidedTour';

type Screen = {
  screen_id: string;
  route: string;
  title: string;
  description: string | null;
  status: string;
  nav_subgroup: string | null;
  nav_order: number;
  nav_visible: boolean;
};

// SAP-style module order: master data → buy → stock → sell → ship → money → service → governance
const MODULES: { key: string; label: string; sap: string }[] = [
  { key: '1_masterdata',  label: 'Master Data',  sap: 'MM Master' },
  { key: '2_procurement', label: 'Procurement',  sap: 'MM' },
  { key: '3_warehouse',   label: 'Warehouse',    sap: 'WM' },
  { key: '4_sales',       label: 'Sales',        sap: 'SD' },
  { key: '5_shipping',    label: 'Shipping',     sap: 'TM' },
  { key: '6_finance',     label: 'Finance',      sap: 'FI/CO' },
  { key: '7_aftersales',  label: 'After-Sales',  sap: 'CS' },
  { key: '8_compliance',  label: 'Compliance',   sap: 'GRC' },
];

export default function SH000Launchpad() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourSubmodule, setTourSubmodule] = useState<string | null>(null);
  const [tourForceStart, setTourForceStart] = useState(false);

  useEffect(() => {
    fetch('/api/bop/shop/screens')
      .then(r => r.json())
      .then(j => setScreens(j.screens ?? []))
      .finally(() => setLoading(false));
  }, []);

  const rootScreens = screens.filter(s => !s.nav_subgroup && s.nav_visible);

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">DES Shop — Module Overview</h1>
        <p className="text-sm text-slate-500 mt-1">All shop screens organized by business flow. Active screens are clickable; planned screens are part of the SCM implementation program.</p>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {/* Cockpit row: dashboard / monitor / settings */}
      {rootScreens.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rootScreens.map(s => <Tile key={s.screen_id} s={s} big />)}
        </div>
      )}

      {/* Module sections */}
      {MODULES.map(m => {
        const items = screens.filter(s => s.nav_subgroup === m.key);
        if (items.length === 0) return null;
        const activeCount = items.filter(s => s.status === 'active').length;
        return (
          <section key={m.key}>
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{m.label}</h2>
              <span className="font-mono text-[10px] text-slate-400">≈ SAP {m.sap}</span>
              <button
                onClick={() => { setTourSubmodule(m.key); setTourForceStart(true); }}
                className="text-xs text-slate-400 hover:text-indigo-500 ml-1"
                title={`Start ${m.label} guided tour`}
              >
                ?
              </button>
              <span className="text-[11px] text-slate-400 ml-auto">{activeCount}/{items.length} active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(s => <Tile key={s.screen_id} s={s} />)}
            </div>
          </section>
        );
      })}

      {tourSubmodule && (
        <GuidedTour
          moduleCode="SHP"
          submodule={tourSubmodule}
          forceStart={tourForceStart}
          onClose={() => { setTourSubmodule(null); setTourForceStart(false); }}
        />
      )}
    </div>
  );
}

function Tile({ s, big }: { s: Screen; big?: boolean }) {
  const active = s.status === 'active';
  const isDetail = s.route.includes('[');
  const body = (
    <div className={`rounded-xl border p-4 h-full transition-colors ${
      active && !isDetail
        ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-indigo-300 hover:shadow-sm cursor-pointer'
        : 'border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/20'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 rounded px-1.5 py-0.5">{s.screen_id}</span>
        <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${
          active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
        }`}>{active ? 'active' : s.status}</span>
      </div>
      <p className={`${big ? 'text-base' : 'text-sm'} font-semibold ${active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>{s.title}</p>
      {s.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{s.description}</p>}
    </div>
  );
  if (active && !isDetail) return <Link href={s.route}>{body}</Link>;
  return body;
}
