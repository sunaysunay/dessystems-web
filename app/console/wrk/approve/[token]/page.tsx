'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ApprovalItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  recommended: boolean;
  accepted?: boolean;
}

interface ApprovalData {
  id: string;
  work_order_id: string;
  wo_number: string;
  status: string;
  items: ApprovalItem[];
  total_amount: number;
  customer_response: string | null;
  signature_data: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function CustomerApprovalPage() {
  const params = useParams();
  const token = params.token as string;

  const [approval, setApproval] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [response, setResponse] = useState('');
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/bop/wrk/approvals?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const row = d.data?.[0] ?? d;
        setApproval(row);
        const parsed = Array.isArray(row.items) ? row.items : [];
        setItems(parsed.map((it: ApprovalItem) => ({ ...it, accepted: it.accepted ?? true })));
        if (row.customer_response) setResponse(row.customer_response);
        if (row.signature_data) setSignature(row.signature_data);
      })
      .catch(() => setError('Could not load approval'))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleItem(idx: number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, accepted: !it.accepted } : it));
  }

  async function handleSubmit() {
    if (!approval || !signature.trim()) return;
    setSubmitting(true);

    const allAccepted = items.every(i => i.accepted);
    const noneAccepted = items.every(i => !i.accepted);
    const status = noneAccepted ? 'rejected' : allAccepted ? 'approved' : 'partially_approved';

    await fetch('/api/bop/wrk/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: approval.id,
        status,
        items: items,
        customer_response: response,
        signature_data: signature,
        responded_at: new Date().toISOString(),
      }),
    });

    setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-lg font-semibold text-slate-800">Approval Not Found</h1>
          <p className="text-sm text-slate-500 mt-2">{error || 'This link may have expired or is invalid.'}</p>
        </div>
      </div>
    );
  }

  const isExpired = approval.expires_at && new Date(approval.expires_at) < new Date();
  const isResponded = approval.status !== 'pending';

  if (isExpired && !isResponded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-lg font-semibold text-slate-800">Verlopen</h1>
          <p className="text-sm text-slate-500 mt-2">Dit goedkeuringsverzoek is verlopen. Neem contact op met de werkplaats.</p>
        </div>
      </div>
    );
  }

  if (submitted || isResponded) {
    const statusLabel: Record<string, string> = {
      approved: 'Goedgekeurd',
      partially_approved: 'Gedeeltelijk goedgekeurd',
      rejected: 'Afgewezen',
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md text-center">
          <div className="text-4xl mb-4">{approval.status === 'rejected' ? '❌' : '✅'}</div>
          <h1 className="text-lg font-semibold text-slate-800">Bedankt voor uw reactie</h1>
          <p className="text-sm text-slate-500 mt-2">
            Status: <span className="font-medium text-slate-700">{statusLabel[approval.status] ?? approval.status}</span>
          </p>
          {approval.customer_response && (
            <p className="text-xs text-slate-400 mt-4 italic">&ldquo;{approval.customer_response}&rdquo;</p>
          )}
        </div>
      </div>
    );
  }

  const acceptedTotal = items.filter(i => i.accepted).reduce((s, i) => s + (i.total || i.quantity * i.unit_price), 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-slate-800 text-white p-6">
            <h1 className="text-lg font-semibold">Goedkeuring extra werkzaamheden</h1>
            <p className="text-sm text-slate-300 mt-1">Werkorder {approval.wo_number || '—'}</p>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              Wij hebben bij inspectie van uw voertuig de volgende werkzaamheden gevonden.
              Selecteer welke u wilt laten uitvoeren.
            </p>

            <div className="divide-y border rounded-lg">
              {items.map((item, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <button
                    onClick={() => toggleItem(i)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      item.accepted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 text-transparent'
                    }`}
                  >
                    ✓
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{item.description}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.quantity}x @ €{item.unit_price?.toFixed(2)}
                      {item.recommended && (
                        <span className="ml-2 text-amber-600 font-medium">Aanbevolen</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 flex-shrink-0">
                    €{(item.total || item.quantity * item.unit_price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center py-3 border-t">
              <span className="text-sm font-medium text-slate-600">Geselecteerd totaal</span>
              <span className="text-lg font-bold text-slate-800">€{acceptedTotal.toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Opmerkingen (optioneel)</label>
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                className="w-full border rounded-lg p-3 text-sm text-slate-700 resize-none"
                rows={3}
                placeholder="Eventuele opmerkingen..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Uw naam (verplicht)</label>
              <input
                type="text"
                value={signature}
                onChange={e => setSignature(e.target.value)}
                className="w-full border rounded-lg p-3 text-sm text-slate-700"
                placeholder="Volledige naam"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !signature.trim()}
              className="w-full bg-emerald-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Verzenden...' : 'Bevestigen'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Powered by DES Systems Workshop Intelligence
        </p>
      </div>
    </div>
  );
}
