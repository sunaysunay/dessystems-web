'use client';
// SA015 — Buyer Inbox: on-platform conversations from desmobil (buyer ↔ DES).
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function BuyerInboxPage() {
  const router = useRouter();
  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const j = await fetch('/api/bop/sal/buyer-inbox').then(r => r.json());
    setConvs(j.conversations ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); const iv = setInterval(() => { void load(); }, 30000); return () => clearInterval(iv); }, [load]);

  return (
    <div className="p-6">
      <ScreenHeader title="Buyer Inbox" description="desmobil.com buyer conversations — reply fast, deals close on speed" />
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
              {['', 'Vehicle', 'Ref', 'Buyer', 'Last activity', 'Status'].map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : convs.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">No buyer conversations yet.</td></tr>
            ) : convs.map(c => (
              <tr key={c.id} onClick={() => router.push(`/console/sal/buyer-inbox/${c.id}`)}
                className={`cursor-pointer border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${c.des_unread > 0 ? 'bg-orange-50/60 font-semibold' : ''}`}>
                <td className="px-3 py-2.5 w-8">
                  {c.des_unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">{c.des_unread}</span>}
                </td>
                <td className="px-3 py-2.5 text-slate-800">{c.bop_listings?.brand} {c.bop_listings?.model} {c.bop_listings?.year ? `(${c.bop_listings.year})` : ''}</td>
                <td className="px-3 py-2.5 font-mono text-slate-500">{c.bop_listings?.ref_no ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-600">{c.buyer?.display_name ?? c.buyer_id.slice(0, 8)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{c.last_message_at ? new Date(c.last_message_at).toLocaleString('nl-NL') : '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    c.status === 'open' ? 'bg-emerald-100 text-emerald-700' : c.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    {c.status}
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
