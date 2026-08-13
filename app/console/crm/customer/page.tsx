'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const ROLE_COLOR: Record<string,string> = {
  buyer:'bg-blue-100 text-blue-700', seller:'bg-emerald-100 text-emerald-700',
  both:'bg-violet-100 text-violet-700', supplier:'bg-amber-100 text-amber-700',
  partner:'bg-cyan-100 text-cyan-700',
};

export default function CR003Page() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load(q: string) {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (q) params.set('search', q);
    const j = await fetch('/api/bop/md/partners?' + params).then(r => r.json());
    setCustomers(j.partners ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(''); }, []);
  useEffect(() => {
    const t = setTimeout(() => { void load(search); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <ScreenHeader title="Customer 360" description="CR003 — Full customer profiles with lead history, invoices and activity"/>

      <div className="mb-4 flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email..." className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-72 focus:outline-none focus:border-blue-400"/>
        <span className="text-sm text-slate-400">{customers.length} customers</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Customer</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Phone</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">Roles</th>
              <th className="px-5 py-3 text-left">Since</th>
              <th className="px-5 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No customers found</td></tr>
            ) : customers.map((c: any) => {
              const roles: string[] = (c.mdm_partner_roles ?? []).map((r: any) => r.role_type);
              const initials = (c.company_name||c.name||'?').slice(0,2).toUpperCase();
              return (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push('/console/crm/customer/' + c.id)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex-shrink-0">{initials}</div>
                      <span className="font-medium text-slate-800">{c.company_name||c.name||'—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c.email||'—'}</td>
                  <td className="px-5 py-3 text-slate-500">{c.phone||'—'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">{c.partner_type||'—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {roles.map((r: string) => (
                        <span key={r} className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (ROLE_COLOR[r]??'bg-slate-100 text-slate-500')}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <button onClick={e => { e.stopPropagation(); router.push('/console/crm/customer/' + c.id); }}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600">
                      360 View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
