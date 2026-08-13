'use client';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import { AccountSecurityPanel } from '@/components/AccountSecurity';
import { HelpMenu } from '@/components/HelpMenu';

// Client mirror of middleware ROLE_MODULES (keyed by the scope role values).
// A menu item is enabled only if the current role is allowed its module.
const ROLE_MODULES: Record<string, string[]> = {
  super_admin:    ['SYS','ANL','AST','CRM','FIN','INV','MDM','MKP','MKT','OPS','PUB','SAL','BOP','DEV','INT','AUC','DAE'],
  platform_admin: ['SYS','ANL','AST','CRM','FIN','INV','MDM','MKP','MKT','OPS','PUB','SAL','BOP','DEV','INT','AUC','DAE'],
  tenant_manager: ['SYS','ANL','AST','CRM','FIN','INV','MDM','MKP','MKT','OPS','PUB','SAL','BOP'],
  viewer:         ['ANL','AST','CRM','MKP','SAL'],
};

type Row =
  | { kind: 'link'; label: string; href: string; module?: string; hint?: string }
  | { kind: 'action'; label: string; run: () => void; danger?: boolean }
  | { kind: 'soon'; label: string }
  | { kind: 'account'; label: string }
  | { kind: 'settings'; label: string }
  | { kind: 'help'; label: string }
  | { kind: 'submenu'; label: string; children: { label: string; href: string; module?: string; hint?: string }[] }
  | { kind: 'sep'; label: string };

export function SystemMenu({ settingsPanel }: { settingsPanel?: ReactNode }) {
  const { role } = useScope();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showAcct, setShowAcct] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const allowedModules = ROLE_MODULES[role] ?? [];
  function canAccess(mod?: string) { return !mod || allowedModules.includes(mod); }


  const rows: Row[] = [
    { kind: 'sep', label: 'Preferences' },
    { kind: 'settings', label: 'Settings' },
    { kind: 'help', label: 'Help & Documentation' },
    { kind: 'account', label: 'Account & Security' },
    { kind: 'sep', label: 'System' },
    { kind: 'submenu', label: 'Administration', children: [
      { label: 'Company Settings', href: '/console/sys/settings', module: 'SYS' },
      { label: 'System Status',    href: '/console/sys/health',   module: 'SYS' },
      { label: 'Active Sessions',  href: '/console/sys/sessions', module: 'SYS' },
      { label: 'Audit Log',        href: '/console/sys/audit',    module: 'SYS' },
      { label: 'Scheduled Jobs',   href: '/console/sys/jobs',     module: 'SYS' },
    ] },
    { kind: 'submenu', label: 'Integration', children: [
      { label: 'Integration Status', href: '/console/int/connectors', module: 'INT' },
      { label: 'Integration Log',    href: '/console/int/log',        module: 'INT' },
      { label: 'Flow Manager',       href: '/console/int/flows',      module: 'INT' },
      { label: 'Message Queue',      href: '/console/int/queue',      module: 'INT' },
      { label: 'Field Mapping Studio', href: '/console/int/mappings',   module: 'INT' },
      { label: 'Lookup Codes',         href: '/console/int/lookup',     module: 'INT' },
      { label: 'Publish Jobs',          href: '/console/int/publish',    module: 'INT' },
      { label: 'Webhook Events',        href: '/console/int/webhook-events', module: 'INT' },
      { label: 'Listings Cockpit',      href: '/console/dae/cockpit',        module: 'DAE' },
      { label: 'Search Profiles',       href: '/console/dae/profiles',       module: 'DAE' },
      { label: 'Source Config',         href: '/console/dae/sources',        module: 'DAE' },
      { label: 'Run History',           href: '/console/dae/runs',           module: 'DAE' },
      { label: 'Price Intelligence',    href: '/console/dae/pricing',        module: 'DAE' },
    ] },
    { kind: 'sep', label: 'Account' },
    { kind: 'link', label: 'User Cockpit',  href: '/console/sys/user-cockpit', module: 'SYS' },
    { kind: 'sep', label: 'Coming soon' },
    { kind: 'soon', label: 'Import Center' },
    { kind: 'soon', label: 'Export Center' },
    { kind: 'soon', label: 'Backup & Restore' },
    { kind: 'soon', label: 'License Information' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} title="System"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span className="hidden lg:inline">System</span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-60 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {rows.map((r, i) => {
            if (r.kind === 'sep') return (
              <div key={i} className="mt-1 px-3 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">{r.label}</div>
            );
            if (r.kind === 'soon') return (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm text-slate-300">
                <span>{r.label}</span><span className="rounded bg-slate-100 px-1 text-[9px] text-slate-400">soon</span>
              </div>
            );
            if (r.kind === 'account') return (
              <div key={i} className="relative" onMouseEnter={() => setShowAcct(true)} onMouseLeave={() => setShowAcct(false)}>
                <button className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <svg className="mr-auto h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  <span className="ml-2 flex-1">{r.label}</span>
                </button>
                {showAcct && (
                  <div className="absolute right-full top-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <p className="mb-2 text-sm font-bold text-slate-800">Account &amp; Security</p>
                    <AccountSecurityPanel />
                  </div>
                )}
              </div>
            );
            if (r.kind === 'submenu') return (
              <div key={i} className="relative" onMouseEnter={() => setOpenSub(r.label)} onMouseLeave={() => setOpenSub(null)}>
                <button className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <svg className="mr-auto h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  <span className="ml-2 flex-1">{r.label}</span>
                </button>
                {openSub === r.label && (
                  <div className="absolute right-full top-0 z-50 max-h-[80vh] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {r.children.map((c, ci) => {
                      if (!canAccess(c.module)) return (
                        <div key={ci} title={`Requires ${c.module} access — not available for your role`}
                          className="flex cursor-not-allowed items-center justify-between px-3 py-1.5 text-sm text-slate-300">
                          <span>{c.label}</span>
                          <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        </div>
                      );
                      return (
                        <button key={ci} onClick={() => { setOpen(false); router.push(c.href); }}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                          <span>{c.label}</span>{c.hint && <span className="font-mono text-[10px] text-slate-400">{c.hint}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
            if (r.kind === 'help') return (
              <div key={i} className="relative" onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)}>
                <button className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <svg className="mr-auto h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  <span className="ml-2 flex-1">{r.label}</span>
                </button>
                {showHelp && (
                  <div className="absolute right-full top-0 z-50 max-h-[80vh] w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    <HelpMenu inline />
                  </div>
                )}
              </div>
            );
            if (r.kind === 'settings') return (
              <div key={i} className="relative" onMouseEnter={() => setShowSettings(true)} onMouseLeave={() => setShowSettings(false)}>
                <button className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <svg className="mr-auto h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  <span className="ml-2 flex-1">{r.label}</span>
                </button>
                {showSettings && settingsPanel && (
                  <div className="absolute right-full top-0 z-50 max-h-[80vh] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {settingsPanel}
                  </div>
                )}
              </div>
            );
            if (r.kind === 'action') return (
              <button key={i} onClick={() => { setOpen(false); r.run(); }}
                className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${r.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'}`}>
                {r.label}
              </button>
            );
            // link — role-gated
            const ok = canAccess(r.module);
            if (!ok) return (
              <div key={i} title={`Requires ${r.module} access — not available for your role`}
                className="flex cursor-not-allowed items-center justify-between px-3 py-1.5 text-sm text-slate-300">
                <span>{r.label}</span>
                <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
            );
            return (
              <button key={i} onClick={() => { setOpen(false); router.push(r.href); }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                <span>{r.label}</span>{r.hint && <span className="font-mono text-[10px] text-slate-400">{r.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
