'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const SETTING_GROUPS = [
  {
    group: 'Company',
    keys: [
      { key: 'company_name',    label: 'Company Name',     type: 'text' },
      { key: 'company_email',   label: 'Contact Email',    type: 'text' },
      { key: 'company_phone',   label: 'Phone',            type: 'text' },
      { key: 'company_address', label: 'Address',          type: 'text' },
      { key: 'company_vat',     label: 'VAT Number',       type: 'text' },
      { key: 'company_coc',     label: 'CoC Number',       type: 'text' },
      { key: 'company_iban',    label: 'IBAN',             type: 'text' },
    ],
  },
  {
    group: 'Invoicing',
    keys: [
      { key: 'invoice_prefix',      label: 'Invoice Prefix',       type: 'text' },
      { key: 'invoice_payment_days', label: 'Payment Term (days)', type: 'number' },
      { key: 'invoice_footer_note', label: 'Invoice Footer Text',  type: 'textarea' },
      { key: 'default_tax_rate',    label: 'Default VAT %',        type: 'number' },
    ],
  },
  {
    group: 'Quotations',
    keys: [
      { key: 'quote_prefix',       label: 'Quote Prefix',          type: 'text' },
      { key: 'quote_validity_days', label: 'Validity (days)',      type: 'number' },
      { key: 'quote_footer_note',  label: 'Quote Footer Text',     type: 'textarea' },
    ],
  },
];

export default function SY004Page() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    void fetch('/api/bop/sys/settings').then(r => r.json()).then(j => {
      const map: Record<string, string> = {};
      (j.settings ?? []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/bop/sys/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    showToast('Settings saved');
  }

  return (
    <div>
      <ScreenHeader title="System Settings" description="Global BOP configuration — SY004" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-6">
          {SETTING_GROUPS.map(group => (
            <div key={group.group} className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">{group.group}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.keys.map(({ key, label, type }) => (
                  <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={settings[key] ?? ''} onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                        rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
                    ) : (
                      <input type={type} value={settings[key] ?? ''} onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button onClick={() => { void save(); }} disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save All Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
