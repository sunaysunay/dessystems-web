'use client';
import { useEffect, useRef } from 'react';

interface ContextPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  width?: number;
}

// Right-slide context panel — replaces full-page navigation for detail views
export function ContextPanel({
  open, onClose, title, subtitle, badge, badgeColor = 'bg-blue-100 text-blue-700', children, width = 480,
}: ContextPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={ref}
        style={{ width }}
        className={`fixed right-0 top-0 z-50 flex h-full flex-col bg-white shadow-2xl transition-transform duration-250 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>{badge}</span>}
              <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
            </div>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="ml-3 flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}

// Standard tab bar for Object 360 views
export function PanelTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-slate-100 px-4 bg-slate-50/50">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
            active === t.id
              ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500 after:rounded-t'
              : 'text-slate-400 hover:text-slate-600'
          }`}>
          {t.label}
          {t.count !== null && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${active === t.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Standard empty state
export function PanelEmpty({ label = 'No data yet' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <svg className="mb-3 h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}
