'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import { useScope } from '@/lib/scope-context';

// SY037 — Automation Engine. Governing doc: BOP_COMM_CENTER_PLAN.md §1/§7.
// Event -> template binding, the SAP-NAST-style condition record screen.
// Event catalog is a starter list (plan §7 open item — this is the manual
// draft that item calls for; the Automation Co-Pilot idea in plan §8 #2 is
// the later, self-discovering v1.1 extension of this same screen).

const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Card = ({ children, className = '' }: any) => <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;

const EVENT_CATALOG = [
  { code: 'listing.published', label: 'Listing published' },
  { code: 'listing.rejected', label: 'Listing rejected' },
  { code: 'auction.won', label: 'Auction won' },
  { code: 'lead.created', label: 'Lead created' },
  { code: 'lead.followup_due', label: 'Lead follow-up due' },
  { code: 'invoice.issued', label: 'Invoice issued' },
  { code: 'invoice.overdue', label: 'Invoice overdue' },
  { code: 'order.confirmed', label: 'Order confirmed' },
  { code: 'delivery.scheduled', label: 'Delivery scheduled' },
] as const;

interface Automation {
  id?: string; tenant_id: number; event_code: string; template_id: string | null;
  is_active: boolean; delay_minutes: number;
  bop_comm_template?: { category: string; locale: string; subject: string } | null;
}
interface Template { id: string; category: string; locale: string; subject?: string }

const BLANK: Automation = { tenant_id: 0, event_code: EVENT_CATALOG[0].code, template_id: null, is_active: true, delay_minutes: 0 };

export default function CM002Page() {
  const { unit } = useScope();
  const tid = unit.id;
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  useEffect(() => {
  }, []);

  const load = useCallback(() => {
    if (tid === null) return;
    void fetch(`/api/bop/comm/automation?tenant=${tid}`).then(r => r.json()).then(j => setAutomations(j.automations ?? []));
    void fetch(`/api/bop/comm/templates?tenant=${tid}`).then(r => r.json()).then(j => setTemplates(j.templates ?? []));
  }, [tid]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.template_id) { showToast('✗ Pick a template to bind'); return; }
    setSaving(true);
    const isNew = !editing.id;
    const j = await fetch('/api/bop/comm/automation', {
      method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editing, tenant_id: editing.tenant_id ?? tid }),
    }).then(r => r.json());
    setSaving(false);
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast('✓ Automation saved');
    setEditing(null);
    load();
  }

  const boundEventCodes = new Set(automations.map(a => a.event_code));

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <ScreenHeader title="Automation Engine" description="Event → template binding — CM002" />
        <div className="flex items-center gap-3">
<button onClick={() => setEditing({ ...BLANK, tenant_id: tid ?? 0 })}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">+ New binding</button>
        </div>
      </div>

      {toast && <div className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{toast}</div>}

      <div className="grid grid-cols-12 gap-5">
        <Card className={editing ? 'col-span-7' : 'col-span-12'}>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Active bindings — {unit.label ?? tid}</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr><th className="py-2">Event</th><th>Template</th><th>Delay</th><th>Active</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {automations.map(a => (
                <tr key={a.id}>
                  <td className="py-2 font-mono text-xs">{a.event_code}</td>
                  <td className="text-xs text-slate-600">{a.bop_comm_template ? `${a.bop_comm_template.category} (${a.bop_comm_template.locale})` : <span className="text-red-500">unbound</span>}</td>
                  <td className="text-xs text-slate-500">{a.delay_minutes === 0 ? 'immediate' : `+${a.delay_minutes}m`}</td>
                  <td><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{a.is_active ? 'active' : 'off'}</span></td>
                  <td className="text-right"><button onClick={() => setEditing(a)} className="text-xs text-blue-600 hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {automations.length === 0 && <p className="mt-3 text-xs text-slate-400">No automation bindings yet for this tenant. Automation is opt-in — nothing fires until you create a binding here.</p>}

          <div className="mt-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Unbound events</h3>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATALOG.filter(e => !boundEventCodes.has(e.code)).map(e => (
                <button key={e.code} onClick={() => setEditing({ ...BLANK, tenant_id: tid ?? 0, event_code: e.code })}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-blue-300 hover:text-blue-600">
                  + {e.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {editing && (
          <Card className="col-span-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">{editing.id ? 'Edit binding' : 'New binding'}</h2>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Event</label>
                <BopSelect size="md" value={editing.event_code} disabled={!!editing.id}
                  onChange={v => setEditing(p => p && { ...p, event_code: v })}
                  options={EVENT_CATALOG.map(e => ({ value: e.code, label: e.label }))} />
              </div>
              <div>
                <label className={lbl}>Template</label>
                <BopSelect size="md" value={editing.template_id ?? ''} onChange={v => setEditing(p => p && { ...p, template_id: v })}
                  options={templates.map(t => ({ value: t.id, label: `${t.category} (${t.locale})` }))}
                  placeholder="Pick a template…" />
              </div>
              <div>
                <label className={lbl}>Delay (minutes, 0 = immediate)</label>
                <input type="number" min={0} className={inp} value={editing.delay_minutes}
                  onChange={e => setEditing(p => p && { ...p, delay_minutes: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editing.is_active} onChange={e => setEditing(p => p && { ...p, is_active: e.target.checked })} id="ea" />
                <label htmlFor="ea" className="text-xs text-slate-600">Active</label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save binding'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
