'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

/* ── Types ──────────────────────────────────────────────────────────────────── */

type Grade = 'leerling' | 'monteur' | 'senior_monteur' | 'meester' | 'specialist';

interface Rate {
  id: string;
  grade: Grade;
  hourly_rate: number;
  cost_rate: number;
  revenue_group: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const GRADES: { value: Grade; label: string }[] = [
  { value: 'leerling', label: 'Leerling' },
  { value: 'monteur', label: 'Monteur' },
  { value: 'senior_monteur', label: 'Senior Monteur' },
  { value: 'meester', label: 'Meester' },
  { value: 'specialist', label: 'Specialist' },
];

const GRADE_LABEL: Record<Grade, string> = {
  leerling: 'Leerling',
  monteur: 'Monteur',
  senior_monteur: 'Senior Monteur',
  meester: 'Meester',
  specialist: 'Specialist',
};

const GRADE_COLOR: Record<Grade, string> = {
  leerling: 'bg-sky-50 text-sky-700',
  monteur: 'bg-blue-50 text-blue-700',
  senior_monteur: 'bg-indigo-50 text-indigo-700',
  meester: 'bg-purple-50 text-purple-700',
  specialist: 'bg-amber-50 text-amber-700',
};

const GRADE_CARD_BORDER: Record<Grade, string> = {
  leerling: 'border-sky-200',
  monteur: 'border-blue-200',
  senior_monteur: 'border-indigo-200',
  meester: 'border-purple-200',
  specialist: 'border-amber-200',
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function eur(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isCurrentRate(r: Rate): boolean {
  const today = todayStr();
  return r.effective_from <= today && (!r.effective_to || r.effective_to >= today);
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function LabourRatesPage() {
  const [rows, setRows] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [gradeFilter, setGradeFilter] = useState('');
  const [activeOn, setActiveOn] = useState(todayStr());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formGrade, setFormGrade] = useState<Grade>('monteur');
  const [formHourly, setFormHourly] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formRevGroup, setFormRevGroup] = useState('');
  const [formFrom, setFormFrom] = useState(todayStr());
  const [formTo, setFormTo] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  /* ── Data loading ────────────────────────────────────────────────────────── */

  function loadRates() {
    setLoading(true);
    const p = new URLSearchParams();
    if (gradeFilter) p.set('grade', gradeFilter);
    if (activeOn) p.set('active_on', activeOn);
    fetch(`/api/bop/wrk/rates?${p}`)
      .then(r => r.json())
      .then(j => { setRows(j.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRates(); }, [gradeFilter, activeOn]);

  /* ── Current rates per grade (for summary cards) ─────────────────────────── */

  function getCurrentRateForGrade(grade: Grade): Rate | null {
    const matching = rows.filter(r => r.grade === grade && isCurrentRate(r));
    if (matching.length === 0) return null;
    // Return the most recent effective_from
    return matching.sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  }

  /* ── Actions ─────────────────────────────────────────────────────────────── */

  function resetForm() {
    setEditId(null);
    setFormGrade('monteur');
    setFormHourly('');
    setFormCost('');
    setFormRevGroup('');
    setFormFrom(todayStr());
    setFormTo('');
    setShowForm(false);
  }

  function startEdit(r: Rate) {
    setEditId(r.id);
    setFormGrade(r.grade);
    setFormHourly(String(r.hourly_rate));
    setFormCost(String(r.cost_rate));
    setFormRevGroup(r.revenue_group ?? '');
    setFormFrom(r.effective_from);
    setFormTo(r.effective_to ?? '');
    setShowForm(true);
  }

  function saveRate() {
    if (!formHourly || !formCost) { showToast('Hourly rate and cost rate are required'); return; }

    if (editId) {
      // PATCH
      fetch('/api/bop/wrk/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          hourly_rate: parseFloat(formHourly),
          cost_rate: parseFloat(formCost),
          effective_to: formTo || null,
        }),
      })
        .then(r => r.json())
        .then(j => {
          if (j.error) { showToast(`Error: ${j.error}`); return; }
          showToast('Rate updated');
          resetForm();
          loadRates();
        });
    } else {
      // POST
      fetch('/api/bop/wrk/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: formGrade,
          hourly_rate: parseFloat(formHourly),
          cost_rate: parseFloat(formCost),
          revenue_group: formRevGroup || null,
          effective_from: formFrom,
          effective_to: formTo || null,
        }),
      })
        .then(r => r.json())
        .then(j => {
          if (j.error) { showToast(`Error: ${j.error}`); return; }
          showToast('Rate created');
          resetForm();
          loadRates();
        });
    }
  }

  function deleteRate(id: string) {
    if (!confirm('Delete this rate permanently?')) return;
    fetch('/api/bop/wrk/rates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast('Rate deleted');
        loadRates();
      });
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-4">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <ScreenHeader />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {GRADES.map(g => {
          const current = getCurrentRateForGrade(g.value);
          const margin = current ? current.hourly_rate - current.cost_rate : 0;
          return (
            <div key={g.value} className={`rounded-xl border bg-white p-4 ${GRADE_CARD_BORDER[g.value]}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{g.label}</div>
              {current ? (
                <div className="mt-2 space-y-1">
                  <div className="text-lg font-bold text-slate-800">{eur(current.hourly_rate)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Cost {eur(current.cost_rate)}</span>
                    <span className="text-emerald-600 font-semibold">+{eur(margin)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-400">No active rate</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { if (showForm && !editId) { resetForm(); } else { resetForm(); setShowForm(true); } }}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm">
          + Add Rate
        </button>

        {/* Grade filter */}
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 focus:border-blue-400 focus:outline-none">
          <option value="">All Grades</option>
          {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>

        {/* Active on date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Active on</span>
          <input type="date" value={activeOn} onChange={e => setActiveOn(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none" />
        </div>

        <button onClick={() => { loadRates(); showToast('Refreshed'); }}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          Refresh
        </button>

        <span className="text-xs text-slate-400">{rows.length} records</span>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {editId ? 'Edit Rate' : 'New Labour Rate'}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <select value={formGrade} onChange={e => setFormGrade(e.target.value as Grade)}
              disabled={!!editId}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none disabled:opacity-50">
              {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Hourly rate" value={formHourly}
              onChange={e => setFormHourly(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
            <input type="number" step="0.01" placeholder="Cost rate" value={formCost}
              onChange={e => setFormCost(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
            <input type="text" placeholder="Revenue group" value={formRevGroup}
              onChange={e => setFormRevGroup(e.target.value)}
              disabled={!!editId}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none disabled:opacity-50" />
            <input type="date" value={formFrom} onChange={e => setFormFrom(e.target.value)}
              disabled={!!editId}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none disabled:opacity-50"
              title="Effective from" />
            <input type="date" value={formTo} onChange={e => setFormTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              title="Effective to (optional)" />
            <div className="flex gap-2">
              <button onClick={saveRate}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                {editId ? 'Update' : 'Save'}
              </button>
              <button onClick={resetForm}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No rates found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Grade</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Hourly Rate</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Cost Rate</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Margin</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue Group</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Effective From</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Effective To</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(r => {
                  const margin = r.hourly_rate - r.cost_rate;
                  const current = isCurrentRate(r);
                  return (
                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${current ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${GRADE_COLOR[r.grade]}`}>
                          {GRADE_LABEL[r.grade]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{eur(r.hourly_rate)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{eur(r.cost_rate)}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">{eur(margin)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{r.revenue_group ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{fmtDate(r.effective_from)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {r.effective_to ? fmtDate(r.effective_to) : (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">Current</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(r)}
                            className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                            Edit
                          </button>
                          <button onClick={() => deleteRate(r.id)}
                            className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
