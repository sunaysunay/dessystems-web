'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';
import { Kpi } from '@/components/CockpitKit';

/* ── Types ──────────────────────────────────────────────────────────── */

interface Inspection {
  id: string;
  vehicle_id: string;
  work_order_id: string | null;
  inspector_id: string | null;
  checklist: ChecklistCategory[] | null;
  photos: string[] | null;
  condition_grade: string | null;
  summary: string | null;
  customer_report_token: string | null;
  wo_number: string | null;
  wo_status: string | null;
  inspector_name: string | null;
  created_at: string;
}

interface ChecklistItem {
  label: string;
  status: 'green' | 'amber' | 'red';
}

interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

/* ── Default checklist template (Dutch garage) ─────────────────────── */

const DEFAULT_CHECKLIST: ChecklistCategory[] = [
  { category: 'Remmen', items: [
    { label: 'Remschijven', status: 'green' },
    { label: 'Remblokken', status: 'green' },
    { label: 'Remvloeistof', status: 'green' },
  ]},
  { category: 'Verlichting', items: [
    { label: 'Koplampen', status: 'green' },
    { label: 'Achterlichten', status: 'green' },
    { label: 'Richtingaanwijzers', status: 'green' },
  ]},
  { category: 'Banden', items: [
    { label: 'Profieldiepte', status: 'green' },
    { label: 'Bandenspanning', status: 'green' },
  ]},
  { category: 'Onderstel', items: [
    { label: 'Schokdempers', status: 'green' },
    { label: 'Wielophanging', status: 'green' },
    { label: 'Kogelscharnier', status: 'green' },
  ]},
  { category: 'Motor', items: [
    { label: 'Oliepeil', status: 'green' },
    { label: 'Koelvloeistof', status: 'green' },
    { label: 'Distributieriem', status: 'green' },
  ]},
  { category: 'Uitlaat', items: [
    { label: 'Uitlaatsysteem', status: 'green' },
    { label: 'Emissie', status: 'green' },
  ]},
  { category: 'Interieur', items: [
    { label: 'Gordels', status: 'green' },
    { label: 'Dashboard waarschuwingen', status: 'green' },
  ]},
  { category: 'Carrosserie', items: [
    { label: 'Roest', status: 'green' },
    { label: 'Ruitenwissers', status: 'green' },
    { label: 'Laksschade', status: 'green' },
  ]},
];

/* ── Condition grade helpers ───────────────────────────────────────── */

const GRADE_STATUS_MAP: Record<string, string> = {
  good: 'active',
  fair: 'warning',
  poor: 'blocked',
  critical: 'error',
};

const GRADE_TABS = ['all', 'good', 'fair', 'poor', 'critical'] as const;

const STATUS_COLORS: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
};

/* ── Page component ─────────────────────────────────────────────────── */

export default function DigitalInspectionPage() {
  const [rows, setRows] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formWorkOrderId, setFormWorkOrderId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formInspectorId, setFormInspectorId] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formGrade, setFormGrade] = useState('good');
  const [formPhotos, setFormPhotos] = useState('');
  const [formChecklist, setFormChecklist] = useState<ChecklistCategory[]>(
    JSON.parse(JSON.stringify(DEFAULT_CHECKLIST))
  );

  // Work orders + technicians for dropdowns
  const [workOrders, setWorkOrders] = useState<{ id: string; wo_number: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; display_name: string }[]>([]);

  /* ── Data loading ─────────────────────────────────────────────────── */

  function loadInspections() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (gradeFilter !== 'all') params.set('condition_grade', gradeFilter);

    fetch(`/api/bop/wrk/inspections?${params}`)
      .then(r => r.json())
      .then(res => {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  function loadDropdowns() {
    fetch('/api/bop/wrk/orders?limit=100')
      .then(r => r.json())
      .then(res => setWorkOrders(res.data ?? []))
      .catch(() => {});

    fetch('/api/bop/wrk/inspections?limit=1')
      .then(() => {
        // Load technicians — there is no dedicated route, so we skip if unavailable
        fetch('/api/bop/wrk/rates?limit=100')
          .then(r => r.json())
          .then(res => {
            // rates endpoint may return technician data, extract unique techs
            const techs = res.data ?? [];
            const uniqueMap = new Map<string, string>();
            techs.forEach((t: Record<string, unknown>) => {
              if (t.technician_id && t.technician_name) {
                uniqueMap.set(t.technician_id as string, t.technician_name as string);
              }
            });
            setTechnicians(
              Array.from(uniqueMap.entries()).map(([id, display_name]) => ({ id, display_name }))
            );
          })
          .catch(() => {});
      })
      .catch(() => {});
  }

  useEffect(() => { loadInspections(); }, [gradeFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadDropdowns(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── KPI calculations ─────────────────────────────────────────────── */

  const gradeDistribution = rows.reduce<Record<string, number>>((acc, r) => {
    const g = r.condition_grade ?? 'unknown';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = rows.filter(r => new Date(r.created_at) >= weekAgo).length;

  /* ── Form submission ──────────────────────────────────────────────── */

  function handleSubmit() {
    if (!formVehicleId.trim()) return;
    setSaving(true);

    const body: Record<string, unknown> = {
      vehicle_id: formVehicleId.trim(),
      checklist: formChecklist,
      summary: formSummary.trim() || null,
    };
    if (formWorkOrderId) body.work_order_id = formWorkOrderId;
    if (formInspectorId) body.inspector_id = formInspectorId;

    fetch('/api/bop/wrk/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => {
        if (!r.ok) throw new Error('Save failed');
        return r.json();
      })
      .then(created => {
        // Now PATCH to set condition_grade and photos
        const patchBody: Record<string, unknown> = {
          id: created.id,
          condition_grade: formGrade,
        };
        const photoList = formPhotos.split('\n').map(s => s.trim()).filter(Boolean);
        if (photoList.length) patchBody.photos = photoList;

        return fetch('/api/bop/wrk/inspections', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
      })
      .then(() => {
        setShowForm(false);
        resetForm();
        loadInspections();
      })
      .catch(() => alert('Failed to save inspection'))
      .finally(() => setSaving(false));
  }

  function resetForm() {
    setFormWorkOrderId('');
    setFormVehicleId('');
    setFormInspectorId('');
    setFormSummary('');
    setFormGrade('good');
    setFormPhotos('');
    setFormChecklist(JSON.parse(JSON.stringify(DEFAULT_CHECKLIST)));
  }

  function toggleChecklistStatus(catIdx: number, itemIdx: number) {
    const next = JSON.parse(JSON.stringify(formChecklist)) as ChecklistCategory[];
    const current = next[catIdx].items[itemIdx].status;
    const cycle: Record<string, 'green' | 'amber' | 'red'> = {
      green: 'amber',
      amber: 'red',
      red: 'green',
    };
    next[catIdx].items[itemIdx].status = cycle[current];
    setFormChecklist(next);
  }

  /* ── DataGrid columns ─────────────────────────────────────────────── */

  const columns: Column<Inspection>[] = [
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      width: '130px',
      value: (r) => r.created_at,
      render: (r) => (
        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
          {new Date(r.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'wo_number',
      header: 'WO Number',
      sortable: true,
      width: '120px',
      render: (r) => (
        <span className="text-xs font-mono text-slate-700 dark:text-slate-200">
          {r.wo_number ?? '—'}
        </span>
      ),
    },
    {
      key: 'vehicle_id',
      header: 'Vehicle',
      sortable: true,
      width: '120px',
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {r.vehicle_id?.slice(0, 8) ?? '—'}
        </span>
      ),
    },
    {
      key: 'inspector_name',
      header: 'Inspector',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {r.inspector_name ?? '—'}
        </span>
      ),
    },
    {
      key: 'condition_grade',
      header: 'Condition',
      sortable: true,
      width: '100px',
      render: (r) => r.condition_grade ? (
        <StatusBadge
          status={GRADE_STATUS_MAP[r.condition_grade] ?? 'draft'}
          label={r.condition_grade}
        />
      ) : <span className="text-xs text-slate-400">—</span>,
    },
    {
      key: 'photos',
      header: 'Photos',
      width: '70px',
      align: 'center',
      render: (r) => (
        <span className="text-xs tabular-nums text-slate-500">
          {r.photos?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'report',
      header: 'Report',
      width: '80px',
      render: (r) => r.customer_report_token ? (
        <span className="text-xs text-indigo-500 cursor-pointer hover:underline" title={r.customer_report_token}>
          View
        </span>
      ) : <span className="text-xs text-slate-400">—</span>,
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Inspections" value={total} />
        <Kpi label="This Week" value={thisWeek} />
        <Kpi label="Good" value={gradeDistribution['good'] ?? 0} />
        <Kpi label="Poor / Critical" value={(gradeDistribution['poor'] ?? 0) + (gradeDistribution['critical'] ?? 0)} />
      </div>

      {/* Grade distribution bar */}
      {total > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Condition Distribution
          </div>
          <div className="flex h-4 rounded overflow-hidden gap-px">
            {(['good', 'fair', 'poor', 'critical'] as const).map(g => {
              const count = gradeDistribution[g] ?? 0;
              if (!count) return null;
              const pct = (count / total) * 100;
              const colors: Record<string, string> = {
                good: 'bg-emerald-400', fair: 'bg-amber-400', poor: 'bg-orange-500', critical: 'bg-red-500',
              };
              return (
                <div
                  key={g}
                  className={`${colors[g]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${g}: ${count} (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
            {(['good', 'fair', 'poor', 'critical'] as const).map(g => (
              <span key={g} className="flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  g === 'good' ? 'bg-emerald-400' : g === 'fair' ? 'bg-amber-400' : g === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                }`} />
                {g} ({gradeDistribution[g] ?? 0})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs + New button */}
      <div className="flex items-center gap-2 flex-wrap">
        {GRADE_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setGradeFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              gradeFilter === tab
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"
          >
            {showForm ? 'Cancel' : '+ New Inspection'}
          </button>
        </div>
      </div>

      {/* Inline new inspection form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">New Inspection</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Work Order dropdown */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Work Order
              </label>
              <select
                value={formWorkOrderId}
                onChange={e => setFormWorkOrderId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">— Select —</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>{wo.wo_number}</option>
                ))}
              </select>
            </div>

            {/* Vehicle ID */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Vehicle ID *
              </label>
              <input
                type="text"
                value={formVehicleId}
                onChange={e => setFormVehicleId(e.target.value)}
                placeholder="Enter vehicle ID"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Inspector dropdown */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Inspector
              </label>
              {technicians.length > 0 ? (
                <select
                  value={formInspectorId}
                  onChange={e => setFormInspectorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">— Select —</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.display_name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formInspectorId}
                  onChange={e => setFormInspectorId(e.target.value)}
                  placeholder="Inspector ID"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              )}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Inspection Checklist
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {formChecklist.map((cat, catIdx) => (
                <div key={cat.category} className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    {cat.category}
                  </div>
                  <div className="space-y-1">
                    {cat.items.map((item, itemIdx) => (
                      <div key={item.label} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleChecklistStatus(catIdx, itemIdx)}
                          className={`flex-shrink-0 h-5 w-5 rounded-full ${STATUS_COLORS[item.status]} transition-colors`}
                          title={`${item.status} — click to cycle`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Condition Grade */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Condition Grade
              </label>
              <select
                value={formGrade}
                onChange={e => setFormGrade(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Photo URLs */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Photo URLs (one per line)
              </label>
              <textarea
                value={formPhotos}
                onChange={e => setFormPhotos(e.target.value)}
                rows={3}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Summary
            </label>
            <textarea
              value={formSummary}
              onChange={e => setFormSummary(e.target.value)}
              rows={3}
              placeholder="Overall inspection notes..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formVehicleId.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : 'Save Inspection'}
            </button>
          </div>
        </div>
      )}

      {/* Data grid */}
      <DataGrid
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No inspections found"
        defaultSort={{ key: 'created_at', dir: 'desc' }}
        pageSize={25}
      />
    </div>
  );
}
