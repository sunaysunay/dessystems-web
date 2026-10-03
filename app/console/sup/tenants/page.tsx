'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { useRouter } from 'next/navigation';
import type { Tenant } from '@/lib/support/types';

const KIND_CHIP: Record<string, string> = {
  internal: 'bg-blue-100 text-blue-700',
  external: 'bg-green-100 text-green-700',
};
const STATUS_CHIP: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  offboarded: 'bg-slate-100 text-slate-400',
};

const CHANNELS = ['console', 'api', 'email', 'widget', 'portal'];

interface TenantForm {
  name: string;
  slug: string;
  case_prefix: string;
  kind: string;
  locale: string;
  timezone: string;
  channels_enabled: string[];
}

const emptyForm: TenantForm = {
  name: '', slug: '', case_prefix: '', kind: 'external',
  locale: 'nl', timezone: 'Europe/Amsterdam', channels_enabled: ['console'],
};

export default function SU003Page() {
  useScope();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  function loadTenants() {
    setLoading(true);
    fetch('/api/bop/support/tenants')
      .then(r => r.json())
      .then(j => { setTenants(j.tenants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadTenants(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setEditSlug(null);
    setShowAdd(true);
  }

  function openEdit(t: Tenant) {
    setForm({
      name: t.name,
      slug: t.slug,
      case_prefix: t.case_prefix,
      kind: t.kind,
      locale: t.locale,
      timezone: t.timezone,
      channels_enabled: [...t.channels_enabled],
    });
    setEditSlug(t.slug);
    setShowAdd(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editSlug) {
        const res = await fetch(`/api/bop/support/tenants/${editSlug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            kind: form.kind,
            locale: form.locale,
            timezone: form.timezone,
            channels_enabled: form.channels_enabled,
          }),
        });
        if (res.ok) { showToast('Tenant updated'); loadTenants(); setShowAdd(false); }
        else { const j = await res.json(); showToast(j.error || 'Failed'); }
      } else {
        const res = await fetch('/api/bop/support/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) { showToast('Tenant created'); loadTenants(); setShowAdd(false); }
        else { const j = await res.json(); showToast(j.error || 'Failed'); }
      }
    } catch { showToast('Network error'); }
    setSaving(false);
  }

  async function deleteTenant(slug: string) {
    try {
      const res = await fetch(`/api/bop/support/tenants/${slug}`, { method: 'DELETE' });
      const j = await res.json();
      if (res.ok) {
        showToast(j.action === 'offboarded' ? 'Tenant offboarded (has cases)' : 'Tenant deleted');
        loadTenants();
      } else { showToast(j.error || 'Failed'); }
    } catch { showToast('Network error'); }
    setConfirmDelete(null);
  }

  function toggleChannel(ch: string) {
    setForm(f => ({
      ...f,
      channels_enabled: f.channels_enabled.includes(ch)
        ? f.channels_enabled.filter(c => c !== ch)
        : [...f.channels_enabled, ch],
    }));
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <ScreenHeader title="Dashboard" description="SU003 — Registered support tenants" />

      {toast && <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">{tenants.length} tenants</span>
        <button onClick={openAdd} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">
          + Add Tenant
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">{editSlug ? 'Edit Tenant' : 'Add Tenant'}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="Company Name" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Slug</label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
                    disabled={!!editSlug} className="w-full border rounded px-3 py-2 text-sm font-mono disabled:bg-slate-50"
                    placeholder="company-name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Case Prefix</label>
                  <input value={form.case_prefix} onChange={e => setForm(f => ({ ...f, case_prefix: e.target.value.toUpperCase() }))}
                    disabled={!!editSlug} className="w-full border rounded px-3 py-2 text-sm font-mono uppercase disabled:bg-slate-50"
                    placeholder="CK" maxLength={5} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kind</label>
                  <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Locale</label>
                  <select value={form.locale} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="nl">nl</option>
                    <option value="en">en</option>
                    <option value="de">de</option>
                    <option value="fr">fr</option>
                    <option value="tr">tr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Timezone</label>
                  <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                    <option value="Europe/Istanbul">Europe/Istanbul</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Channels</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(ch => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                        form.channels_enabled.includes(ch)
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.slug || !form.case_prefix}
                className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Saving...' : editSlug ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Tenant</h3>
            <p className="text-sm text-slate-500 mb-4">
              Are you sure you want to delete <strong>{confirmDelete}</strong>?
              If the tenant has cases, it will be offboarded instead.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
              <button onClick={() => deleteTenant(confirmDelete)} className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No tenants registered</div>
      ) : (
        <div className="grid gap-3">
          {tenants.map(t => (
            <div key={t.id} className="border rounded-lg p-4 bg-white hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <div className="cursor-pointer flex-1" onClick={() => router.push(`/console/sup/tenants/${t.slug}`)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{t.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${KIND_CHIP[t.kind] || ''}`}>{t.kind}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_CHIP[t.status] || ''}`}>{t.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Slug: <strong>{t.slug}</strong></span>
                    <span>Prefix: <strong>{t.case_prefix}</strong></span>
                    <span>Locale: {t.locale}</span>
                    <span>TZ: {t.timezone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.channels_enabled.map(ch => (
                    <span key={ch} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{ch}</span>
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                    className="ml-2 text-xs text-teal-600 hover:text-teal-800 px-2 py-1 rounded hover:bg-teal-50">
                    Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(t.slug); }}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
