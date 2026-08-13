'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useScope } from '@/lib/scope-context';

type Item =
  | { kind: 'action'; label: string; hint?: string; run: () => void }
  | { kind: 'link'; label: string; hint?: string; href: string }
  | { kind: 'soon'; label: string }
  | { kind: 'sep'; label?: string };

export function HelpMenu({ inline = false }: { inline?: boolean }) {
  const { env, unit, role, user } = useScope();
  const [open, setOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inline) return;
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [inline]);

  function fire(name: string) { window.dispatchEvent(new Event(name)); }
  function searchFocus() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  }

  const items: Item[] = [
    { kind: 'sep', label: 'Context' },
    { kind: 'action', label: 'Page Help', hint: 'F1', run: () => fire('bop:open-help') },
    { kind: 'action', label: 'Keyboard Shortcuts', hint: '?', run: () => setShowKeys(true) },
    { kind: 'action', label: 'Search / Command', hint: '⌘K', run: searchFocus },
    { kind: 'sep', label: 'Reference' },
    { kind: 'link', label: 'System Documentation', hint: 'SY024', href: '/console/sys/screen-explorer' },
    { kind: 'link', label: 'API Documentation', href: '/console/sys/object-explorer' },
    { kind: 'link', label: 'Documentation Browser', hint: 'SY034', href: '/console/sys/docs' },
    { kind: 'sep', label: 'Comm Center' },
    { kind: 'link', label: 'Email Style Library', hint: 'SY036', href: '/console/sys/comm/styles' },
    { kind: 'link', label: 'Automation Engine',   hint: 'SY037', href: '/console/sys/comm/automation' },
    { kind: 'link', label: 'Communication Log',   hint: 'SY038', href: '/console/sys/comm/log' },
    { kind: 'link', label: 'Template Studio',     hint: 'SY039', href: '/console/sys/comm/templates' },
    { kind: 'link', label: "Release Notes / What's New", hint: 'DV005', href: '/console/dev/releases' },
    { kind: 'sep', label: 'Support' },
    { kind: 'action', label: 'Submit Feedback', run: () => { window.location.href = `mailto:support@dessystems.io?subject=BOP Feedback&body=Screen: ${location.pathname}%0D%0A%0D%0A`; } },
    { kind: 'action', label: 'Contact Support', run: () => { window.location.href = 'mailto:support@dessystems.io?subject=BOP Support Request'; } },
    { kind: 'action', label: 'About BOP V2', run: () => setShowAbout(true) },
    { kind: 'sep', label: 'Coming soon' },
    { kind: 'soon', label: 'Business Process Explorer' },
    { kind: 'soon', label: 'SOP Library' },
    { kind: 'soon', label: 'Tutorials & Video Academy' },
    { kind: 'soon', label: 'Troubleshooting' },
  ];

  const list = items.map((it, i) => {
    if (it.kind === 'sep') return (
      <div key={i} className="mt-1 px-3 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">{it.label}</div>
    );
    if (it.kind === 'soon') return (
      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm text-slate-300">
        <span>{it.label}</span><span className="rounded bg-slate-100 px-1 text-[9px] text-slate-400">soon</span>
      </div>
    );
    if (it.kind === 'link') return (
      <Link key={i} href={it.href} onClick={() => setOpen(false)}
        className="flex items-center justify-between px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
        <span>{it.label}</span>{it.hint && <span className="font-mono text-[10px] text-slate-400">{it.hint}</span>}
      </Link>
    );
    return (
      <button key={i} onClick={() => { setOpen(false); it.run(); }}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
        <span>{it.label}</span>{it.hint && <span className="font-mono text-[10px] text-slate-400">{it.hint}</span>}
      </button>
    );
  });

  const modals = (
    <>
      {showKeys && (
        <Modal title="Keyboard Shortcuts" onClose={() => setShowKeys(false)}>
          <ul className="space-y-2 text-sm">
            {[
              ['⌘K / Ctrl+K', 'Search — TC code or description'],
              ['F1', 'Contextual help for the current screen'],
              ['Shift + ?', 'Contextual help (alternate)'],
              ['Esc', 'Close panel / dialog'],
            ].map(([k, d]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="text-slate-600">{d}</span>
                <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{k}</kbd>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {showAbout && (
        <Modal title="About BOP V2" onClose={() => setShowAbout(false)}>
          <div className="space-y-1.5 text-sm">
            <Row k="Platform" v="DES Systems — BOP V2 Console" />
            <Row k="Environment" v={env} />
            <Row k="Business unit" v={`${unit.label} (${unit.id})`} />
            <Row k="Signed in as" v={user.name} />
            <Row k="Role" v={role.replace('_', ' ')} />
          </div>
          <p className="mt-3 text-xs text-slate-400">Global admin panel for DES Systems — listings, auctions, CRM, finance and operations.</p>
        </Modal>
      )}
    </>
  );

  // Inline mode: render just the list + modals (used inside the System menu side panel)
  if (inline) return <>{list}{modals}</>;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} title="Help"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none">?</span>
        <span className="hidden lg:inline">Help</span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {list}
        </div>
      )}

      {modals}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v}</span></div>;
}
