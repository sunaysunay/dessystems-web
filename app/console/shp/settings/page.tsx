'use client';
import { ScreenHeader } from '@/components/ScreenBadge';

interface SettingsSection {
  title: string;
  description: string;
  items: string[];
}

const sections: SettingsSection[] = [
  {
    title: 'General',
    description: 'Shop identity, storefront domain, default locale and currency.',
    items: ['Shop name & branding', 'Default locale & currency', 'Storefront domain', 'Legal entity details'],
  },
  {
    title: 'Payments',
    description: 'Payment providers, accepted methods, and Mollie configuration.',
    items: ['Mollie API keys & webhooks', 'Accepted payment methods', 'Refund policy defaults', 'Payment status mapping'],
  },
  {
    title: 'Shipping',
    description: 'Shipping zones, carriers, and rate tables.',
    items: ['Shipping zones', 'Carrier integrations', 'Rate tables & thresholds', 'Free shipping rules'],
  },
  {
    title: 'Tax',
    description: 'VAT rates, tax classes, and regional compliance.',
    items: ['VAT rates by region', 'Tax classes per product', 'Reverse charge rules', 'Compliance registrations'],
  },
  {
    title: 'Notifications',
    description: 'Transactional emails and internal alerting.',
    items: ['Order confirmation emails', 'Stock & fulfilment alerts', 'Claims/RMA notifications', 'Admin escalation rules'],
  },
];

export default function SH008Page() {
  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        Shop configuration overview. Editable controls for each section will be wired up in a later phase.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{s.description}</p>
            </div>
            <ul className="space-y-1.5">
              {s.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  {item}
                </li>
              ))}
            </ul>
            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              Not yet configurable
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
