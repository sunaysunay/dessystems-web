'use client';
import { localeLabels, locales } from '@/i18n/config';
import { getClientLocale, setClientLocale } from '@/lib/i18n';
import { useState } from 'react';

export function LocaleSwitcher() {
  const current = getClientLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {localeLabels[current]}
        <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-40 min-w-[80px] rounded-xl border border-slate-200 bg-white shadow-lg dark:bg-slate-900 dark:border-slate-700 overflow-hidden">
            {locales.map(l => (
              <button
                key={l}
                onClick={() => { setClientLocale(l); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  l === current ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {localeLabels[l]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
