'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';
import { Kpi } from '@/components/CockpitKit';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OrderLine {
  id: string;
  line_type: 'labour' | 'parts' | 'sublet' | 'sundry';
  description: string;
  hours: number | null;
  rate: number | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  sort_order: number;
}

interface Technician {
  id: string;
  display_name: string;
  grade: string | null;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  vehicle_id: string | null;
  customer_id: string | null;
  technician_id: string | null;
  bay_id: string | null;
  status: string;
  type: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  standard_hours: number | null;
  estimated_completion: string | null;
  completed_at: string | null;
  mileage_at_intake: number | null;
  warranty_claim_id: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  wrk_technicians: Technician | null;
  wrk_order_lines: OrderLine[];
}

interface RdwData {
  plate: string;
  brand: string;
  model: string;
  year: string;
  fuel: string;
  color: string;
  weight: string;
  apk_expiry: string;
  engine_capacity: string;
}

interface PlateLookupResult {
  rdw: RdwData | null;
  asset: { id: string; license_plate: string; brand: string; model: string; year: number | null } | null;
  matched: boolean;
}

interface DraftLine {
  line_type: string;
  description: string;
  hours: string;
  rate: string;
  quantity: string;
  unit_price: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_TABS = ['all', 'draft', 'scheduled', 'in_progress', 'waiting_parts', 'waiting_approval', 'completed'] as const;

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  waiting_parts: 'Waiting Parts',
  waiting_approval: 'Waiting Approval',
  completed: 'Completed',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'apk', label: 'APK' },
  { value: 'warranty_repair', label: 'Warranty' },
  { value: 'bodywork', label: 'Bodywork' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  scheduled: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  in_progress: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  waiting_parts: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  waiting_approval: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  completed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  invoiced: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
};

const TYPE_COLORS: Record<string, string> = {
  repair: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  maintenance: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  apk: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  warranty_repair: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  bodywork: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  diagnostic: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  other: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  draft: [
    { label: 'Schedule', next: 'scheduled', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ],
  scheduled: [
    { label: 'Start Work', next: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ],
  in_progress: [
    { label: 'Complete', next: 'completed', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: 'Waiting Parts', next: 'waiting_parts', color: 'bg-purple-100 hover:bg-purple-200 text-purple-700' },
    { label: 'Waiting Approval', next: 'waiting_approval', color: 'bg-purple-100 hover:bg-purple-200 text-purple-700' },
  ],
  waiting_parts: [
    { label: 'Resume Work', next: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  ],
  waiting_approval: [
    { label: 'Resume Work', next: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  ],
  completed: [
    { label: 'Invoice', next: 'invoiced', color: 'bg-teal-600 hover:bg-teal-700 text-white' },
  ],
};

const EMPTY_LINE: DraftLine = { line_type: 'labour', description: '', hours: '', rate: '', quantity: '', unit_price: '' };

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function shortId(id: string | null) {
  if (!id) return '—';
  return id.slice(0, 8);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] ?? TYPE_COLORS.other;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function WoStatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function WorkOrdersPage() {
  // Data
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');

  // Detail panel
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);

  // ── Load data ──────────────────────────────────────────────

  function loadOrders() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (searchQ) params.set('q', searchQ);

    fetch(`/api/bop/wrk/orders?${params}`)
      .then(r => r.json())
      .then(res => {
        setOrders(res.data ?? []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  function loadTechnicians() {
    fetch('/api/bop/wrk/technicians')
      .then(r => r.json())
      .then(res => setTechnicians(res.data ?? []))
      .catch(() => {});
  }

  useEffect(() => { loadOrders(); }, [statusFilter, typeFilter, searchQ]);
  useEffect(() => { loadTechnicians(); }, []);

  // ── KPIs ───────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // We need ALL orders for KPIs, not just filtered. Use the full set when filter is 'all'.
    // For simplicity, compute from whatever we have loaded.
    const all = orders;
    const closedStatuses = ['completed', 'invoiced', 'cancelled'];
    const open = all.filter(o => !closedStatuses.includes(o.status));
    const inProgress = all.filter(o => o.status === 'in_progress');
    const overdue = all.filter(o =>
      o.estimated_completion &&
      new Date(o.estimated_completion) < now &&
      !closedStatuses.includes(o.status)
    );
    const completedThisWeek = all.filter(o =>
      o.status === 'completed' &&
      o.completed_at &&
      new Date(o.completed_at) >= weekStart
    );

    return {
      totalOpen: open.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      completedWeek: completedThisWeek.length,
    };
  }, [orders]);

  // ── Columns ────────────────────────────────────────────────

  const columns: Column<WorkOrder>[] = useMemo(() => [
    {
      key: 'wo_number',
      header: 'WO Number',
      sortable: true,
      width: '140px',
      pin: 'left' as const,
      render: (r: WorkOrder) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{r.wo_number}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: '120px',
      render: (r: WorkOrder) => <TypeBadge type={r.type} />,
    },
    {
      key: 'vehicle_id',
      header: 'Vehicle',
      width: '100px',
      render: (r: WorkOrder) => (
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{shortId(r.vehicle_id)}</span>
      ),
    },
    {
      key: 'customer_id',
      header: 'Customer',
      width: '100px',
      render: (r: WorkOrder) => (
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{shortId(r.customer_id)}</span>
      ),
    },
    {
      key: 'technician',
      header: 'Technician',
      sortable: true,
      width: '150px',
      value: (r: WorkOrder) => r.wrk_technicians?.display_name ?? '',
      render: (r: WorkOrder) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {r.wrk_technicians?.display_name ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '130px',
      render: (r: WorkOrder) => <WoStatusBadge status={r.status} />,
    },
    {
      key: 'estimated_hours',
      header: 'Est. Hours',
      sortable: true,
      width: '90px',
      align: 'right' as const,
      render: (r: WorkOrder) => (
        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
          {r.estimated_hours != null ? r.estimated_hours.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      width: '120px',
      value: (r: WorkOrder) => r.created_at,
      render: (r: WorkOrder) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(r.created_at)}</span>
      ),
    },
  ], []);

  // ── Handlers ───────────────────────────────────────────────

  function handleRowClick(row: WorkOrder) {
    setExpandedId(prev => prev === row.id ? null : row.id);
  }

  async function transitionStatus(order: WorkOrder, nextStatus: string) {
    const updates: Record<string, unknown> = { id: order.id, status: nextStatus };
    if (nextStatus === 'completed') updates.completed_at = new Date().toISOString();

    const res = await fetch('/api/bop/wrk/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) loadOrders();
  }

  async function saveNotes(order: WorkOrder, notes: string) {
    await fetch('/api/bop/wrk/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, notes }),
    });
  }

  async function saveMileage(order: WorkOrder, mileage: number) {
    await fetch('/api/bop/wrk/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, mileage_at_intake: mileage }),
    });
  }

  // ── Detail Panel ───────────────────────────────────────────

  function DetailPanel({ order }: { order: WorkOrder }) {
    const [notes, setNotes] = useState(order.notes ?? '');
    const [mileage, setMileage] = useState(String(order.mileage_at_intake ?? ''));
    const transitions = STATUS_TRANSITIONS[order.status] ?? [];
    const lines = order.wrk_order_lines ?? [];
    const sortedLines = [...lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const linesTotal = sortedLines.reduce((s, l) => s + (l.total ?? 0), 0);

    return (
      <tr>
        <td colSpan={8} className="p-0">
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-5 space-y-5">
            {/* Header info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">WO Number</span>
                <p className="font-mono font-semibold text-slate-700 dark:text-slate-200">{order.wo_number}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Type</span>
                <p className="mt-0.5"><TypeBadge type={order.type} /></p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Status</span>
                <p className="mt-0.5"><WoStatusBadge status={order.status} /></p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Bay</span>
                <p className="text-slate-600 dark:text-slate-300">{order.bay_id ?? '—'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Vehicle ID</span>
                <p className="font-mono text-slate-600 dark:text-slate-300">{shortId(order.vehicle_id)}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Customer ID</span>
                <p className="font-mono text-slate-600 dark:text-slate-300">{shortId(order.customer_id)}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Technician</span>
                <p className="text-slate-600 dark:text-slate-300">{order.wrk_technicians?.display_name ?? '—'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Warranty Claim</span>
                <p className="font-mono text-slate-600 dark:text-slate-300">{shortId(order.warranty_claim_id)}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Est. Hours</span>
                <p className="text-slate-600 dark:text-slate-300">{order.estimated_hours ?? '—'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Actual Hours</span>
                <p className="text-slate-600 dark:text-slate-300">{order.actual_hours ?? '—'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Est. Completion</span>
                <p className="text-slate-600 dark:text-slate-300">{fmtDateTime(order.estimated_completion)}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Completed At</span>
                <p className="text-slate-600 dark:text-slate-300">{fmtDateTime(order.completed_at)}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Created</span>
                <p className="text-slate-600 dark:text-slate-300">{fmtDateTime(order.created_at)}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Updated</span>
                <p className="text-slate-600 dark:text-slate-300">{fmtDateTime(order.updated_at)}</p>
              </div>
            </div>

            {/* Mileage + Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Mileage at Intake</label>
                <input
                  type="number"
                  value={mileage}
                  onChange={e => setMileage(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(mileage, 10);
                    if (!isNaN(v)) saveMileage(order, v);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="e.g. 125000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={() => saveNotes(order, notes)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Work order notes..."
                />
              </div>
            </div>

            {/* Internal notes (read-only display) */}
            {order.internal_notes && (
              <div>
                <span className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Internal Notes</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  {order.internal_notes}
                </p>
              </div>
            )}

            {/* Order Lines */}
            <div>
              <h4 className="text-[10px] font-semibold uppercase text-slate-400 mb-2">
                Order Lines ({sortedLines.length})
              </h4>
              {sortedLines.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No order lines</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-700/50">
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-400">Type</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-400">Description</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-400">Hours/Qty</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-400">Rate/Price</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sortedLines.map(line => (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            <span className="inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              {line.line_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{line.description || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {line.line_type === 'labour' ? (line.hours ?? '—') : (line.quantity ?? '—')}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {line.line_type === 'labour'
                              ? (line.rate != null ? `€ ${line.rate.toFixed(2)}` : '—')
                              : (line.unit_price != null ? `€ ${line.unit_price.toFixed(2)}` : '—')}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                            {line.total != null ? `€ ${line.total.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-800/40">
                        <td colSpan={4} className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-400">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700 dark:text-slate-200">
                          {'€'} {linesTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Status transitions */}
            {transitions.length > 0 && (
              <div className="flex gap-2 pt-2">
                {transitions.map(t => (
                  <button
                    key={t.next}
                    onClick={() => transitionStatus(order, t.next)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${t.color}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ── Create Form ────────────────────────────────────────────

  function CreateForm() {
    const [type, setType] = useState('repair');
    const [plate, setPlate] = useState('');
    const [plateLookup, setPlateLookup] = useState<PlateLookupResult | null>(null);
    const [plateLoading, setPlateLoading] = useState(false);
    const [vehicleId, setVehicleId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [technicianId, setTechnicianId] = useState('');
    const [bayId, setBayId] = useState('');
    const [estHours, setEstHours] = useState('');
    const [estCompletion, setEstCompletion] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [lines, setLines] = useState<DraftLine[]>([{ ...EMPTY_LINE }]);
    const [submitting, setSubmitting] = useState(false);

    function lookupPlate() {
      if (!plate.trim()) return;
      setPlateLoading(true);
      setPlateLookup(null);
      fetch('/api/bop/wrk/plate-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate: plate.trim() }),
      })
        .then(r => r.json())
        .then((res: PlateLookupResult) => {
          setPlateLookup(res);
          if (res.matched && res.asset) {
            setVehicleId(res.asset.id);
          }
        })
        .catch(() => {})
        .finally(() => setPlateLoading(false));
    }

    function addLine() {
      setLines([...lines, { ...EMPTY_LINE }]);
    }

    function removeLine(idx: number) {
      setLines(lines.filter((_, i) => i !== idx));
    }

    function updateLine(idx: number, field: keyof DraftLine, value: string) {
      const next = [...lines];
      next[idx] = { ...next[idx], [field]: value };
      setLines(next);
    }

    async function submit() {
      setSubmitting(true);
      const orderLines = lines
        .filter(l => l.description.trim())
        .map(l => ({
          line_type: l.line_type,
          description: l.description,
          hours: l.line_type === 'labour' ? parseFloat(l.hours) || null : null,
          rate: l.line_type === 'labour' ? parseFloat(l.rate) || null : null,
          quantity: l.line_type !== 'labour' ? parseFloat(l.quantity) || null : null,
          unit_price: l.line_type !== 'labour' ? parseFloat(l.unit_price) || null : null,
        }));

      const body: Record<string, unknown> = {
        action: 'create_with_lines',
        type,
        status: 'draft',
        lines: orderLines,
      };
      if (vehicleId) body.vehicle_id = vehicleId;
      if (customerId) body.customer_id = customerId;
      if (technicianId) body.technician_id = technicianId;
      if (bayId) body.bay_id = bayId;
      if (estHours) body.estimated_hours = parseFloat(estHours);
      if (estCompletion) body.estimated_completion = estCompletion;
      if (formNotes) body.notes = formNotes;

      try {
        const res = await fetch('/api/bop/wrk/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setShowCreate(false);
          loadOrders();
        }
      } finally {
        setSubmitting(false);
      }
    }

    const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700';
    const labelCls = 'block text-[10px] font-semibold uppercase text-slate-400 mb-1';

    return (
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">New Work Order</h3>
          <button
            onClick={() => setShowCreate(false)}
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type */}
          <div>
            <label className={labelCls}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              {TYPE_OPTIONS.filter(o => o.value).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Plate lookup */}
          <div className="md:col-span-2">
            <label className={labelCls}>Kenteken (License Plate)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={plate}
                onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="e.g. AB123CD"
                className={inputCls}
              />
              <button
                onClick={lookupPlate}
                disabled={plateLoading || !plate.trim()}
                className="whitespace-nowrap rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 px-4 py-1.5 text-xs font-semibold text-white transition"
              >
                {plateLoading ? 'Looking up...' : 'Lookup'}
              </button>
            </div>

            {/* Plate lookup result */}
            {plateLookup && (
              <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs">
                {plateLookup.matched && plateLookup.asset ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-600">Vehicle found in database</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {plateLookup.asset.brand} {plateLookup.asset.model} ({plateLookup.asset.year ?? 'N/A'}) - {plateLookup.asset.license_plate}
                    </p>
                    <button
                      onClick={() => setVehicleId(plateLookup.asset!.id)}
                      className="rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1 text-[11px] font-semibold mt-1"
                    >
                      Use existing vehicle
                    </button>
                  </div>
                ) : plateLookup.rdw ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-600">Not in database - RDW data found</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {plateLookup.rdw.brand} {plateLookup.rdw.model} ({plateLookup.rdw.year}) - {plateLookup.rdw.fuel}, {plateLookup.rdw.color}
                    </p>
                    <p className="text-slate-400">APK expiry: {plateLookup.rdw.apk_expiry || 'N/A'}</p>
                    <button
                      onClick={() => {/* Would create vehicle via ast_assets API */}}
                      className="rounded bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 text-[11px] font-semibold mt-1"
                    >
                      Register new vehicle
                    </button>
                  </div>
                ) : (
                  <p className="text-red-500">No data found for this plate</p>
                )}
              </div>
            )}
          </div>

          {/* Vehicle ID (manual or auto-filled) */}
          <div>
            <label className={labelCls}>Vehicle ID</label>
            <input type="text" value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputCls} placeholder="Auto-filled from plate lookup" />
          </div>

          {/* Customer */}
          <div>
            <label className={labelCls}>Customer ID</label>
            <input type="text" value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputCls} placeholder="Customer UUID" />
          </div>

          {/* Technician */}
          <div>
            <label className={labelCls}>Technician</label>
            <select value={technicianId} onChange={e => setTechnicianId(e.target.value)} className={inputCls}>
              <option value="">Select technician...</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.display_name}{t.grade ? ` (${t.grade})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Bay */}
          <div>
            <label className={labelCls}>Bay</label>
            <input type="text" value={bayId} onChange={e => setBayId(e.target.value)} className={inputCls} placeholder="e.g. Bay 1" />
          </div>

          {/* Est hours */}
          <div>
            <label className={labelCls}>Estimated Hours</label>
            <input type="number" step="0.5" value={estHours} onChange={e => setEstHours(e.target.value)} className={inputCls} placeholder="e.g. 4.0" />
          </div>

          {/* Est completion */}
          <div>
            <label className={labelCls}>Estimated Completion</label>
            <input type="datetime-local" value={estCompletion} onChange={e => setEstCompletion(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Work order notes..." />
        </div>

        {/* Order Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-semibold uppercase text-slate-400">Order Lines</h4>
            <button onClick={addLine} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
              + Add Line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <select
                  value={line.line_type}
                  onChange={e => updateLine(idx, 'line_type', e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs w-24"
                >
                  <option value="labour">Labour</option>
                  <option value="parts">Parts</option>
                  <option value="sublet">Sublet</option>
                  <option value="sundry">Sundry</option>
                </select>
                <input
                  type="text"
                  value={line.description}
                  onChange={e => updateLine(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                />
                {line.line_type === 'labour' ? (
                  <>
                    <input
                      type="number"
                      step="0.5"
                      value={line.hours}
                      onChange={e => updateLine(idx, 'hours', e.target.value)}
                      placeholder="Hours"
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={line.rate}
                      onChange={e => updateLine(idx, 'rate', e.target.value)}
                      placeholder="Rate"
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      step="1"
                      value={line.quantity}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                      placeholder="Unit Price"
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                    />
                  </>
                )}
                <button
                  onClick={() => removeLine(idx)}
                  className="text-red-400 hover:text-red-600 text-sm px-1 py-1"
                  title="Remove line"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 px-6 py-2 text-sm font-semibold text-white transition"
          >
            {submitting ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </div>
    );
  }

  // ── Custom row rendering with detail panel ─────────────────

  // We can't use DataGrid's built-in row click for expansion with inline detail,
  // because DataGrid doesn't support expandable rows. We'll render our own table
  // but still use DataGrid for the main grid, and render detail panels separately.
  // Actually, let's build the table ourselves for full control over the expanded rows.

  const filteredOrders = useMemo(() => {
    if (!searchQ) return orders;
    const q = searchQ.toLowerCase();
    return orders.filter(o => o.wo_number.toLowerCase().includes(q));
  }, [orders, searchQ]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Open WOs" value={kpis.totalOpen} />
        <Kpi label="In Progress" value={kpis.inProgress} />
        <Kpi label="Overdue" value={kpis.overdue} />
        <Kpi label="Completed This Week" value={kpis.completedWeek} />
      </div>

      {/* Filter tabs + controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setExpandedId(null); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                statusFilter === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {STATUS_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setExpandedId(null); }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Search */}
        <input
          type="text"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Search WO number..."
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
        />

        {/* New WO button */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="ml-auto rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition"
        >
          {showCreate ? 'Close Form' : 'New Work Order'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && <CreateForm />}

      {/* Data table with expandable rows */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left ${col.pin === 'left' ? 'sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10' : ''}`}
                  style={{ width: col.width }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {col.header}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  No work orders found
                </td>
              </tr>
            ) : filteredOrders.map(order => (
              <Fragment key={order.id}>
                <tr
                  onClick={() => handleRowClick(order)}
                  className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    expandedId === order.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 ${
                        col.align === 'right' ? 'text-right' : ''
                      } ${col.pin === 'left' ? 'sticky left-0 bg-white dark:bg-slate-900 z-10' : ''}`}
                    >
                      {col.render ? col.render(order, 0) : String((order as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
                {expandedId === order.id && (
                  <DetailPanel key={`detail-${order.id}`} order={order} />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record count */}
      {!loading && (
        <p className="text-xs text-slate-400">
          {filteredOrders.length} work order{filteredOrders.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
