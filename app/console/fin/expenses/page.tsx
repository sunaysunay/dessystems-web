'use client';
export default function Page() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Kosten</h1>
        <p className="mt-1 text-sm text-slate-500">Track business expenses and cost categories.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <input placeholder="Search..." className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-400" />
          <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white">+ Add New</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-left">Description</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Supplier</th>
              <th className="px-5 py-3 text-left">Amount</th>
              <th className="px-5 py-3 text-left">BTW</th>
              <th className="px-5 py-3 text-left">Receipt</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Loading data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
