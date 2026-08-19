'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function SH062Page() {
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState<'export' | 'erase' | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);

  async function handleExport() {
    if (!customerId) return;
    setBusy('export');
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/bop/shop/customers/gdpr/export?customer_id=${encodeURIComponent(customerId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Export failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleErase() {
    if (!customerId) return;
    if (!confirmErase) { setConfirmErase(true); return; }
    setBusy('erase');
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/bop/shop/customers/gdpr/erase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erase failed');
      setResult(data);
      setConfirmErase(false);
    } catch (e: any) {
      setError(e.message ?? 'Erase failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <ScreenHeader />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Customer Data Request</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Customer ID</label>
          <input
            value={customerId}
            onChange={(e) => { setCustomerId(e.target.value); setConfirmErase(false); }}
            placeholder="Enter customer ID"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={!customerId || busy !== null}
            className="rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-40 hover:bg-blue-700 transition"
          >
            {busy === 'export' ? 'Exporting…' : 'Export Data'}
          </button>
          <button
            onClick={handleErase}
            disabled={!customerId || busy !== null}
            className={`rounded-lg text-sm font-semibold px-4 py-2 disabled:opacity-40 transition ${confirmErase ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            {busy === 'erase' ? 'Erasing…' : confirmErase ? 'Confirm Erase' : 'Erase Data'}
          </button>
        </div>
        {confirmErase && (
          <p className="text-xs text-red-500">This will anonymize the customer's orders permanently. Click "Confirm Erase" again to proceed.</p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Result</h3>
          <pre className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-pre-wrap max-h-96 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
