'use client';
import { useState } from 'react';
import { useScope } from '@/lib/scope-context';
import { PRIORITY_LABEL } from './ops-task-ui';

const REF_RESOLVER: Record<string, { type: string; label: string }> = {
  '/console/crm/leads': { type: 'crm_lead', label: 'CRM Lead' },
  '/console/ast/inventory': { type: 'ast_vehicle', label: 'Vehicle' },
  '/console/sal/quotations': { type: 'sal_quotation', label: 'Quotation' },
  '/console/sal/orders': { type: 'sal_order', label: 'Order' },
  '/console/fin/invoices': { type: 'fin_invoice', label: 'Invoice' },
};

export function QuickAddTaskModal({ onClose, onCreated, currentPath }: {
  onClose: () => void;
  onCreated?: () => void;
  currentPath?: string;
}) {
  const { unit } = useScope();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(2);
  const [dueAt, setDueAt] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [rruleFreq, setRruleFreq] = useState('WEEKLY');
  const [rruleInterval, setRruleInterval] = useState(1);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resolved = currentPath ? Object.entries(REF_RESOLVER).find(([prefix]) => currentPath.startsWith(prefix)) : undefined;

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    const body: Record<string, unknown> = {
      action: 'create',
      tenant_id: unit.id,
      title: title.trim(),
      priority,
    };
    if (description.trim()) body.description = description.trim();
    if (dueAt) body.due_at = new Date(dueAt).toISOString();
    if (resolved) body.ref_object_type = resolved[1].type;
    if (estimatedHours) body.estimated_hours = Number(estimatedHours);

    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());

    setSaving(false);
    if (res.error) { setError(res.error); return; }

    if (recurring && res.task?.id) {
      const rrule = `RRULE:FREQ=${rruleFreq};INTERVAL=${rruleInterval}`;
      await fetch('/api/bop/ops/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: res.task.id, is_recurring: true, rrule }),
      });
    }

    onCreated?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">Quick Add Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>

        {resolved && (
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Linking to <span className="font-semibold text-slate-700">{resolved[1].label}</span> context
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleCreate(); }}
              autoFocus placeholder="What needs to be done?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Optional details..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none resize-none" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Due Date</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estimate (hours)</label>
              <input type="number" step="0.5" min="0" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recurring</label>
              <button type="button" onClick={() => setRecurring(!recurring)}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${recurring ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                {recurring ? 'Yes' : 'No'}
              </button>
            </div>
          </div>

          {recurring && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Frequency</label>
                <select value={rruleFreq} onChange={e => setRruleFreq(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Every N</label>
                <input type="number" min="1" value={rruleInterval} onChange={e => setRruleInterval(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600" />
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => void handleCreate()} disabled={saving || !title.trim()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
