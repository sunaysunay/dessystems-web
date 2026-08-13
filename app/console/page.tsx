'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useScope } from '@/lib/scope-context';

type RecentItem = {
  screen_id: string;
  screen_title: string;
  route: string;
  accessed_at: string;
  tenant_id: number;
};

const MODULE_COLOR: Record<string, string> = {
  BO: 'bg-slate-100 text-slate-600 border-slate-200',
  CR: 'bg-violet-100 text-violet-700 border-violet-200',
  SA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FI: 'bg-amber-100 text-amber-700 border-amber-200',
  IN: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  PB: 'bg-pink-100 text-pink-700 border-pink-200',
  MK: 'bg-orange-100 text-orange-700 border-orange-200',
  OP: 'bg-teal-100 text-teal-700 border-teal-200',
  SY: 'bg-red-100 text-red-700 border-red-200',
};

function tcColor(id: string) {
  return MODULE_COLOR[id.slice(0, 2)] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ConsolePage() {
  const { user, unit } = useScope();
  const router = useRouter();
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deniedModule, setDeniedModule] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const denied = searchParams.get('access_denied');
    if (denied) {
      setDeniedModule(denied);
      setTimeout(() => setDeniedModule(null), 4000);
    }
  }, [searchParams]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!user.email) return;
    fetch(`/api/bop/recent?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(j => { setRecents(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.email]);

  return (
    <div className="flex flex-col items-center justify-start px-8 pt-16 min-h-full">
      {/* Access denied toast */}
      {deniedModule && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-lg">
          <svg className="h-4 w-4 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-rose-700">Access denied</p>
            <p className="text-[11px] text-rose-500">You do not have permission to access the <strong>{deniedModule}</strong> module.</p>
          </div>
        </div>
      )}
      {/* Greeting */}
      <div className="mb-10 text-center">
        <p className="text-3xl font-bold text-slate-900 mb-1">
          {greeting}, {user.name.split(' ')[0] || user.name}.
        </p>
        <p className="text-sm text-slate-400">
          {unit.label} &middot; {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Recent Programs */}
      <div className="w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recent Programs</h2>
          {recents.length > 0 && (
            <span className="text-xs text-slate-300">{recents.length} screens accessed</span>
          )}
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-300">Loading activity…</div>
        ) : recents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-8 py-12 text-center">
            <p className="text-sm font-medium text-slate-400">No recent programs</p>
            <p className="mt-1 text-xs text-slate-300">Programs you open will appear here for quick access</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recents.map(item => (
              <button
                key={item.screen_id}
                onClick={() => router.push(item.route)}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                <span className={`mt-0.5 rounded px-2 py-0.5 font-mono text-[11px] font-bold border ${tcColor(item.screen_id)}`}>
                  {item.screen_id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.screen_title}</p>
                  <p className="text-xs text-slate-400">{timeAgo(item.accessed_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TC search hint */}
      <div className="mt-12 text-center">
        <p className="text-xs text-slate-300">
          Use the search bar to enter a Transaction Code (e.g. <span className="font-mono">BO002</span>) and navigate directly to any program
        </p>
      </div>
    </div>
  );
}
