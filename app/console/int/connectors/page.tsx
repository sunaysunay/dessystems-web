'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const TYPE_LABELS: Record<string, string> = {
  rest_api: 'REST API', soap: 'SOAP', ftp: 'FTP/SFTP', db: 'Database', webhook: 'Webhook',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  disabled: 'bg-slate-100 text-slate-500',
  degraded: 'bg-red-100 text-red-700',
};
const DIR_ICON: Record<string, string> = {
  pull: '↓ Pull', push: '↑ Push', bidirectional: '⇅ Both',
};

export default function ConnectorManagerPage() {
  const [systems, setSystems]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [testing, setTesting]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', system_key: '', system_type: 'rest_api',
    direction: 'pull', base_url: '', auth_type: 'none',
  });
  const [saving, setSaving] = useState(false);
  const [testPlate, setTestPlate]     = useState('');
  const [plateResult, setPlateResult] = useState<any>(null);
  const [plateError, setPlateError]   = useState('');
  const [plateLoading, setPlateLoading] = useState(false);

  const lookupPlate = async () => {
    if (!testPlate.trim()) return;
    setPlateLoading(true); setPlateResult(null); setPlateError('');
    const res = await fetch('/api/bop/int/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flow_key: 'rdw.lookup', payload: { plate: testPlate.trim() } }),
    });
    const data = await res.json();
    setPlateLoading(false);
    if (res.ok && data.status === 'ok') setPlateResult(data.result);
    else setPlateError(data.errorMsg ?? data.error ?? 'Lookup failed');
  };

  const load = () =>
    fetch('/api/bop/int/connectors').then(r => r.json()).then(d => {
      setSystems(d.connectors ?? []);
      setLoading(false);
    });

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!form.name || !form.system_key) return;
    setSaving(true);
    await fetch('/api/bop/int/connectors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ name: '', system_key: '', system_type: 'rest_api', direction: 'pull', base_url: '', auth_type: 'none' });
    void load();
  };

  const testSystem = async (id: string) => {
    setTesting(id);
    await fetch(`/api/bop/int/connectors/${id}/test`, { method: 'POST' });
    setTesting(null);
    void load();
  };

  const toggle = async (id: string, active: boolean) => {
    await fetch(`/api/bop/int/connectors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: active ? 'disabled' : 'active' }),
    });
    void load();
  };

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Connector Manager" description="IT001 — External system registry for the DES Integration Engine (DIE)" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{systems.length} system{systems.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => setShowForm(true)}
          className="rounded-lg bg-des-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          + Register System
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Register External System</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['Name *', 'name', 'text', 'RDW Kentekenregister', undefined],
              ['System Key * (slug)', 'system_key', 'text', 'rdw', undefined],
              ['Base URL', 'base_url', 'text', 'https://api.example.com', undefined],
            ] as const).map(([label, field, type, ph]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input
                  value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: field === 'system_key' ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') : e.target.value }))}
                  type={type} placeholder={ph}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select value={form.system_type} onChange={e => setForm(f => ({ ...f, system_type: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Direction</label>
              <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue">
                <option value="pull">Pull (inbound)</option>
                <option value="push">Push (outbound)</option>
                <option value="bidirectional">Bidirectional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Auth</label>
              <select value={form.auth_type} onChange={e => setForm(f => ({ ...f, auth_type: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue">
                <option value="none">None (public)</option>
                <option value="api_key">API Key</option>
                <option value="oauth2">OAuth 2</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={() => { void create(); }} disabled={saving || !form.name || !form.system_key}
              className="rounded-lg bg-des-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Register'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : systems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          No external systems registered. RDW is seeded — run migration 56 in Supabase SQL Editor to see it here.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['System', 'Key', 'Type', 'Direction', 'Base URL', 'Auth', 'Status', 'Health', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {systems.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.system_key}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{TYPE_LABELS[s.system_type] ?? s.system_type}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{DIR_ICON[s.direction] ?? s.direction}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[140px] truncate">{s.base_url ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.auth_type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {s.last_health_check
                      ? (s.error_count > 0 ? `${s.error_count} err` : 'OK')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { void testSystem(s.id); }} disabled={testing === s.id}
                        className="rounded px-2 py-1 text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                        {testing === s.id ? '…' : 'Test'}
                      </button>
                      <button onClick={() => { void toggle(s.id, s.status === 'active'); }}
                        className={`rounded px-2 py-1 text-xs font-medium ${s.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {s.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* RDW Plate Lookup test panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Test: RDW Plate Lookup</h3>
        <p className="text-xs text-slate-400">Runs the <span className="font-mono">rdw.lookup</span> flow synchronously and writes an audit row to int_runs.</p>
        <div className="flex gap-2">
          <input
            value={testPlate}
            onChange={e => setTestPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') void lookupPlate(); }}
            placeholder="e.g. SV751B"
            maxLength={8}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono w-40 focus:outline-none focus:border-des-blue uppercase"
          />
          <button onClick={() => { void lookupPlate(); }} disabled={plateLoading || !testPlate.trim()}
            className="rounded-lg bg-des-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {plateLoading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
        {plateError && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{plateError}</div>
        )}
        {plateResult && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
            {[
              ['Plate',       plateResult.plate],
              ['Make / Model',`${plateResult.make ?? '—'} ${plateResult.model ?? ''}`.trim()],
              ['Year',        plateResult.year],
              ['Fuel',        plateResult.fuel],
              ['Color',       plateResult.color],
              ['GVW (kg)',    plateResult.gvw_kg],
              ['APK expiry',  plateResult.apk_expiry],
              ['Type hint',   plateResult.vehicle_type_suggestion],
              ['Description', plateResult.description],
            ].map(([k, v]) => v !== null && (
              <div key={String(k)} className="flex gap-2">
                <span className="w-28 text-slate-400 flex-shrink-0">{k}</span>
                <span className="font-medium text-slate-700">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
