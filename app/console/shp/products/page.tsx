'use client';

import { ScreenHeader } from '@/components/ScreenBadge';

export default function SH001Page() {
  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <p className="text-lg font-semibold text-slate-600">Product Catalog</p>
        <p className="text-sm text-slate-400 mt-2">Coming in Phase 1 — Catalog &amp; PIM</p>
      </div>
    </div>
  );
}
