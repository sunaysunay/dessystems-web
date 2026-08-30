'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ApprovalItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  recommended: boolean;
  accepted?: boolean;
}

interface Approval {
  id: string;
  work_order_id: string;
  token: string;
  status: string;
  items: ApprovalItem[];
  total_amount: number;
  customer_response: string | null;
  signature_data: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  wrk_orders: { wo_number: string } | null;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const fmtEur = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function CustomerApprovalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [response, setResponse] = useState('');
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/bop/wrk/approvals?token=${token}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(d => {
        const a = d.data;
        setApproval(a);
        if (a.items) {
          setItems(a.items.map((item: ApprovalItem) => ({ ...item, accepted: item.accepted ?? true })));
        }
      })
      .catch(() => setError('Approval request not found'))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleItem(idx: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, accepted: !item.accepted } : item));
  }

  async function handleSubmit() {
    if (!signature.trim()) {
      setError('Please enter your name to sign');
      return;
    }

    setSubmitting(true);
    setError('');

    const allAccepted = items.every(i => i.accepted);
    const noneAccepted = items.every(i => !i.accepted);
    const status = noneAccepted ? 'rejected' : allAccepted ? 'approved' : 'partially_approved';

    try {
      const res = await fetch('/api/bop/wrk/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status,
          items,
          customer_response: response || null,
          signature_data: JSON.stringify({ name: signature, timestamp: new Date().toISOString() }),
          user_agent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to submit');
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────
  if (!approval) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Not Found</h1>
          <p className="text-sm text-slate-500">This approval request could not be found. Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────
  const isExpired = approval.expires_at && new Date(approval.expires_at) < new Date();
  if (isExpired && approval.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Expired</h1>
          <p className="text-sm text-slate-500">This approval request has expired. Please contact the workshop for a new request.</p>
        </div>
      </div>
    );
  }

  // ── Already responded ───────────────────────────────────────────────
  if (approval.status !== 'pending' || submitted) {
    const statusLabel = submitted
      ? (items.every(i => i.accepted) ? 'approved' : items.every(i => !i.accepted) ? 'rejected' : 'partially approved')
      : approval.status.replace(/_/g, ' ');

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-lg w-full">
          {submitted && (
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">✅</div>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Thank you!</h1>
              <p className="text-sm text-slate-500">Your response has been submitted successfully.</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Work Order</span>
              <span className="text-sm font-medium">{approval.wrk_orders?.wo_number ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Status</span>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                statusLabel.includes('approved') ? 'bg-emerald-50 text-emerald-600' :
                statusLabel === 'rejected' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {statusLabel}
              </span>
            </div>
            {approval.customer_response && (
              <div>
                <span className="text-sm text-slate-500 block mb-1">Your comments</span>
                <p className="text-sm bg-slate-50 rounded-lg p-3">{approval.customer_response}</p>
              </div>
            )}
            {approval.responded_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Responded</span>
                <span className="text-sm">{new Date(approval.responded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            {/* Read-only items list */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Items</h3>
              {(approval.items ?? []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-sm">{item.description}</div>
                    <div className="text-xs text-slate-400">{item.quantity} x {fmtEur(item.unit_price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{fmtEur(item.total)}</div>
                    {item.accepted !== undefined && (
                      <span className={`text-[10px] ${item.accepted ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.accepted ? 'Accepted' : 'Declined'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-semibold text-sm">
                <span>Total</span>
                <span>{fmtEur(approval.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active approval form ────────────────────────────────────────────
  const acceptedTotal = items.filter(i => i.accepted).reduce((s, i) => s + i.total, 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h1 className="text-xl font-bold text-slate-800">Approval Request</h1>
          <p className="text-sm text-slate-500 mt-1">
            Work Order: <strong>{approval.wrk_orders?.wo_number ?? '—'}</strong>
          </p>
          {approval.expires_at && (
            <p className="text-xs text-slate-400 mt-2">
              Valid until {new Date(approval.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Proposed Work Items</h2>
          <p className="text-xs text-slate-400 mb-4">Toggle each item to accept or decline it.</p>

          {items.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                item.accepted
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
              onClick={() => toggleItem(idx)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      item.accepted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {item.accepted && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{item.description}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 ml-7">
                    {item.quantity} x {fmtEur(item.unit_price)}
                    {item.recommended && <span className="ml-2 text-blue-500 font-medium">Recommended</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700">{fmtEur(item.total)}</span>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <span className="text-sm font-semibold text-slate-700">
              Accepted total ({items.filter(i => i.accepted).length} of {items.length} items)
            </span>
            <span className="text-sm font-bold text-slate-800">{fmtEur(acceptedTotal)}</span>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Comments (optional)</label>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={3}
            placeholder="Any comments or questions..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Signature */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name (signature)</label>
          <input
            type="text"
            value={signature}
            onChange={e => setSignature(e.target.value)}
            placeholder="Enter your full name"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">By entering your name, you confirm your response to this approval request.</p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {submitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </div>
    </div>
  );
}
