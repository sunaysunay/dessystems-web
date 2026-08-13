'use client';
// SA017 — Buyer Inquiries: structured question-chip leads from desmobil listing pages.
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  seen:      'bg-amber-100 text-amber-700',
  replied:   'bg-violet-100 text-violet-700',
  closed:    'bg-slate-100 text-slate-500',
  converted: 'bg-teal-100 text-teal-700',
};

const INTENT_COLOR: Record<string, string> = {
  general:    'bg-slate-100 text-slate-600',
  b2b:        'bg-indigo-100 text-indigo-700',
  inspection: 'bg-amber-100 text-amber-700',
  logistics:  'bg-teal-100 text-teal-700',
  technical:  'bg-orange-100 text-orange-700',
};

const INTENT_EMOJI: Record<string, string> = {
  general: '💬', b2b: '💼', inspection: '👀', logistics: '🚚', technical: '🔧',
};

const STATUSES = ['', 'new', 'seen', 'replied', 'closed', 'converted'];

export default function InquiriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('new');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    const res = await fetch(`/api/bop/sal/inquiries?${p}`);
    const j = await res.json();
    setRows(j.inquiries ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6">
      <ScreenHeader
        title="Buyer Inquiries"
        description="Structured question-chip leads from desmobil listing pages"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BopSelect
          value={status}
          onChange={v => setStatus(v)}
          options={STATUSES.map(s => ({ value: s, label: s || 'All statuses' }))}
          className="min-w-[140px]"
        />
        <span className="ml-auto text-[12px] text-slate-400">{rows.length} inquiries</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
              {['Received', 'Listing', 'Intent', 'Questions', 'Name', 'Email', 'Status'].map(h => (
                <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">No inquiries found.</td></tr>
            ) : rows.map(r => (
              <tr
                key={r.id}
                onClick={() => router.push(`/console/sal/inquiries/${r.id}`)}
                className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-orange-50/40"
              >
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                  {new Date(r.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-700 font-semibold">{r.listing_id}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(r.intent_tags ?? []).map((tag: string) => (
                      <span key={tag} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${INTENT_COLOR[tag] ?? 'bg-slate-100 text-slate-500'}`}>
                        {INTENT_EMOJI[tag]} {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {(r.question_codes ?? []).length} q{(r.question_codes ?? []).length !== 1 ? 's' : ''}
                  {r.free_text && <span className="ml-1 text-slate-400">+ note</span>}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-800">{r.contact_name}</td>
                <td className="px-3 py-2.5 text-slate-500">{r.contact_email}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[r.status] ?? ''}`}>
                    {r.status === 'converted' ? '🔗 converted' : r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
