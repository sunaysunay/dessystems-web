'use client';
export default function Page() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Publish Queue</h1>
        <p className="mt-1 text-sm text-slate-500">Review and approve listings queued for publication.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <input placeholder="Search..." className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-400" />
          <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white">+ Add New</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Listing</th>
              <th className="px-5 py-3 text-left">Requested By</th>
              <th className="px-5 py-3 text-left">Channels</th>
              <th className="px-5 py-3 text-left">Queued At</th>
              <th className="px-5 py-3 text-left">Priority</th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
