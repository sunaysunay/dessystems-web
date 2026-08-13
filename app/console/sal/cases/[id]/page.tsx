'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700',
  quotation: 'bg-blue-100 text-blue-700',
  order: 'bg-indigo-100 text-indigo-700',
  invoiced: 'bg-amber-100 text-amber-700',
  handover: 'bg-orange-100 text-orange-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  warranty: 'bg-teal-100 text-teal-700',
};

const DOC_ROUTES: Record<string, string> = {
  lead: '/console/crm/leads/',
  quotation: '/console/sal/quotations/',
  order: '/console/sal/orders/',
  invoice: '/console/fin/invoices/',
  handover: '/console/sal/handovers/',
  warranty: '/console/sal/warranties/',
  survey: '/console/sal/surveys/',
};

const DOC_COLORS: Record<string, string> = {
  lead: 'border-slate-300 bg-slate-50',
  quotation: 'border-blue-300 bg-blue-50',
  order: 'border-indigo-300 bg-indigo-50',
  invoice: 'border-amber-300 bg-amber-50',
  handover: 'border-orange-300 bg-orange-50',
  warranty: 'border-teal-300 bg-teal-50',
  survey: 'border-purple-300 bg-purple-50',
};

const EVENT_ICONS: Record<string, string> = {
  doc_flow: '🔗',
  transition: '⚡',
  approval: '✅',
};

export default function CaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cj, tj] = await Promise.all([
      fetch(`/api/bop/sal/cases/${id}`).then(r => r.json()),
      fetch(`/api/bop/sal/cases/${id}/timeline`).then(r => r.json()),
    ]);
    setCaseData(cj.case_detail ?? null);
    setTimeline(tj.timeline ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading case...</div>;
  if (!caseData) return <div className="flex h-64 items-center justify-center text-sm text-red-400">Case not found</div>;

  const partner = caseData.mdm_business_partners;
  const docs: any[] = caseData.documents ?? [];

  return (
    <div className="space-y-6">
      <ScreenHeader title="Case Detail" description={`TR001 — ${caseData.case_number}`} />

      {/* Header KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KPI label="Case #" value={caseData.case_number} mono />
        <KPI label="Customer" value={partner?.company_name || partner?.name || '—'} />
        <KPI label="Business Line" value={(caseData.business_line ?? '').replace(/_/g, ' ')} />
        <KPI label="Stage" value={
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STAGE_COLORS[caseData.derived_stage] ?? ''}`}>
            {caseData.derived_stage}
          </span>
        } />
        <KPI label="Owner" value={caseData.owner ?? '—'} />
        <KPI label="Language" value={caseData.language?.toUpperCase()} />
        <KPI label="Opened" value={caseData.created_at?.slice(0, 10)} />
      </div>

      {/* Document Cards */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</h3>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-400">No documents linked to this case yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {docs.map((d: any, i: number) => (
              <div
                key={i}
                onClick={() => DOC_ROUTES[d.type] && router.push(DOC_ROUTES[d.type] + d.id)}
                className={`cursor-pointer rounded border p-3 transition-shadow hover:shadow-md dark:bg-slate-800 ${DOC_COLORS[d.type] ?? 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">{d.type}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    ['paid','completed','active','accepted','converted'].includes(d.status) ? 'bg-emerald-100 text-emerald-700'
                    : ['cancelled','credited','voided','lost','declined'].includes(d.status) ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>{d.status}</span>
                </div>
                <p className="mt-1 font-mono text-xs font-medium">{d.ref}</p>
                {d.kind && <p className="text-[10px] text-slate-400">Kind: {d.kind}</p>}
                {d.version && <p className="text-[10px] text-slate-400">Version: {d.version}</p>}
                {d.nps_score != null && <p className="text-[10px] text-slate-400">NPS: {d.nps_score}</p>}
                <p className="mt-1 text-[10px] text-slate-400">{d.updated_at?.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Timeline */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-xs text-slate-400">No timeline events yet.</p>
        ) : (
          <div className="relative space-y-0 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            {timeline.map((ev: any, i: number) => (
              <div key={i} className="relative pb-4">
                <div className="absolute -left-[22px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs dark:bg-slate-900">
                  {EVENT_ICONS[ev.event_type] ?? '•'}
                </div>
                <div className="text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{ev.event_action}</span>
                  <span className="ml-2 text-slate-400">{ev.event_detail}</span>
                  {ev.actor && <span className="ml-2 text-slate-400">by {ev.actor}</span>}
                </div>
                <p className="text-[10px] text-slate-400">{ev.event_at?.replace('T', ' ').slice(0, 19)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
