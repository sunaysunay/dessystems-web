'use client';
import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  color?: string;
  badge?: string;
}

interface BopSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function BopSelect({ value, onChange, options, placeholder = 'Select…', className = '', size = 'sm', disabled = false }: BopSelectProps) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // keyboard-highlighted option index
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bufRef = useRef(''); // type-ahead buffer, resets after a pause
  const bufTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (!open) { setHi(-1); bufRef.current = ''; } }, [open]);

  function scrollToIdx(idx: number) {
    const el = listRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }

  // Type-ahead: typing while open jumps to the first option whose label starts
  // with the typed buffer (e.g. "5" → "5000 - Caravans"). Arrows/Enter/Escape too.
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hi >= 0 && options[hi]) { onChange(options[hi].value); setOpen(false); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(hi + 1, options.length - 1) : Math.max(hi - 1, 0);
      setHi(next); scrollToIdx(next);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      bufRef.current += e.key.toLowerCase();
      if (bufTimer.current) clearTimeout(bufTimer.current);
      bufTimer.current = setTimeout(() => { bufRef.current = ''; }, 800);
      const idx = options.findIndex(o => o.label.toLowerCase().startsWith(bufRef.current));
      if (idx >= 0) { setHi(idx); scrollToIdx(idx); }
    }
  }

  const py = size === 'md' ? 'py-2' : 'py-1.5';
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-xl border ${py} px-3 font-medium transition-all duration-150 ${
          disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60' : open
            ? 'border-blue-300 bg-blue-50 shadow-sm shadow-blue-100'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
        }`}>
        <div className="flex min-w-0 items-center gap-2">
          {selected?.color && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: selected.color }} />
          )}
          {selected?.badge && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500">
              {selected.badge}
            </span>
          )}
          <span className={`truncate ${textSize} ${selected ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
            {selected?.label ?? placeholder}
          </span>
        </div>
        <svg
          className={`ml-2 h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-black/5">
          <div ref={listRef} className="max-h-64 overflow-y-auto py-1.5">
            {options.map((opt, idx) => {
              const isActive = opt.value === value;
              const isHi = idx === hi;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={() => { onChange(opt.value); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive ? 'bg-blue-50' : isHi ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}>
                  {opt.color && (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: opt.color }} />
                  )}
                  {opt.badge && (
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold flex-shrink-0 ${
                      isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>{opt.badge}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-semibold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span className={`ml-1.5 text-xs ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
