'use client';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function DB004Page() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ScreenHeader />
      <div className="border rounded-lg p-8 text-center space-y-3">
        <div className="text-4xl font-light text-gray-300">DB004</div>
        <h2 className="text-xl font-semibold">SQL Runner</h2>
        <p className="text-gray-500 max-w-md mx-auto">Execute SQL with AST classification and dry-run safety</p>
        <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">Coming Soon — Phase 1+</span>
      </div>
    </div>
  );
}
