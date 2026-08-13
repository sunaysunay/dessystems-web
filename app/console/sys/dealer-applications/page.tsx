'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type Application = {
  id: string;
  email: string;
  company_name: string | null;
  company_address: string | null;
  vat_number: string | null;
  country: string | null;
  locale: string;
  status: 'pending' | 'approved' | 'rejected';
  tenant_id: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
};

const STATUS_CHIP: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-600 border border-red-200',
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function ReviewModal({ app, onClose, onDone }: { app: Application; onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!action) return;
    setBusy(true); setErr('');
    const res = await fetch('/api/bop/sys/dealer-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, action, review_notes: notes || null }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? 'Request failed'); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-bg/60">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted/60 mb-0.5">SY041 · Review Application</p>
            <h2 className="text-base font-bold text-text">{app.company_name ?? app.email}</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-bg text-xl leading-none">x</button>
        </div>

        <div className="px-6 py-4 space-y-3 border-b border-border/40">
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div className="flex items-center gap-2 text-muted">Email: <span className="text-text font-medium">{app.email}</span></div>
            {app.company_name && <div className="flex items-center gap-2 text-muted">Company: <span className="text-text font-medium">{app.company_name}</span></div>}
            {app.vat_number && <div className="flex items-center gap-2 text-muted">VAT: <span className="text-text font-medium">{app.vat_number}</span></div>}
            {app.country && <div className="flex items-center gap-2 text-muted">Country: <span className="text-text font-medium">{app.country}</span></div>}
            {app.company_address && <div className="col-span-2 text-muted">Address: <span className="text-text">{app.company_address}</span></div>}
          </div>
          <p className="text-[11px] text-muted">Submitted {timeAgo(app.created_at)} · locale: {app.locale}</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-3">
            <button onClick={() => setAction('approve')}
              className={`flex-1 rounded-xl py-3 text-[14px] font-bold border-2 transition-all ${action === 'approve' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border/60 text-muted hover:border-emerald-400 hover:text-emerald-600'}`}>
              Approve
            </button>
            <button onClick={() => setAction('reject')}
              className={`flex-1 rounded-xl py-3 text-[14px] font-bold border-2 transition-all ${action === 'reject' ? 'bg-red-500 border-red-500 text-white' : 'border-border/60 text-muted hover:border-red-400 hover:text-red-600'}`}>
              Reject
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted/70">
              {action === 'reject' ? 'Reason for rejection (sent to applicant)' : 'Note to applicant (optional)'}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder={action === 'reject' ? 'e.g. VAT number could not be verified...' : 'Optional welcome note...'}
              className="w-full rounded-xl border border-border/80 bg-bg/50 px-4 py-3 text-[13px] text-text placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
          </div>

          {err && <p className="text-[13px] text-red-500 bg-red-50/50 rounded-lg px-3 py-2 border border-red-100">{err}</p>}

          <button onClick={() => { void submit(); }} disabled={!action || busy}
            className={`w-full rounded-xl py-3.5 text-[14px] font-bold text-white transition-all disabled:opacity-40 disabled:pointer-events-none ${action === 'reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
            {busy ? 'Processing...' : action === 'approve' ? 'Approve & Send Access Email' : 'Reject & Notify Applicant'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DealerApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bop/sys/dealer-applications?status=${filter}&limit=100`);
    const json = await res.json().catch(() => ({}));
    setApps(json.applications ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <ScreenHeader title="Dealer Applications" description="SY041 · Review incoming dealer and partner account applications" />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${filter === f ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-bg/60'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => { void load(); }} className="text-[12px] font-semibold text-muted hover:text-text transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted text-[13px]">Loading...</div>
      ) : apps.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] font-semibold text-muted">No {filter} applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id}
              className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 hover:border-accent/30 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => app.status === 'pending' ? setSelected(app) : undefined}>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black text-[15px] shrink-0">
                {(app.company_name ?? app.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[14px] font-bold text-text truncate">{app.company_name ?? '-'}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_CHIP[app.status]}`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-[12px] text-muted truncate">{app.email}{app.country ? ` - ${app.country}` : ''}{app.vat_number ? ` - ${app.vat_number}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-muted">{timeAgo(app.created_at)}</p>
                {app.tenant_id && <p className="text-[11px] font-semibold text-accent">Tenant {app.tenant_id}</p>}
                {app.status === 'pending' && <span className="text-[11px] font-semibold text-accent">Review</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ReviewModal app={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); void load(); }} />
      )}
    </div>
  );
}
