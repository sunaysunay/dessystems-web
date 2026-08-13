'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

import { NavSection, NavLeaf } from '@/hooks/use-nav';
type NavItemSimple = NavLeaf & { subitems?: NavLeaf[]; subgroups?: { subgroup: string; items: NavLeaf[] }[] };

interface Props {
  NAV: NavSection[];
  pathname: string;
  navIcons: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function flattenItems(item: NavItemSimple): { subgroup?: string; leaves: NavLeaf[] }[] {
  if (item.subitems) return [{ leaves: item.subitems }];
  if (item.subgroups) return item.subgroups.map(sg => ({ subgroup: sg.subgroup, leaves: sg.items }));
  return [{ leaves: [item as NavLeaf] }];
}

// ── MegaDropdown ─────────────────────────────────────────────────────────────
function MegaDropdown({
  section, pathname, triggerRect, onClose, onKeepOpen,
}: {
  section: NavSection;
  pathname: string;
  triggerRect: DOMRect;
  onClose: () => void;
  onKeepOpen: () => void;
}) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const panelWidth = Math.min(640, vw - 24);
  let left = triggerRect.left;
  if (left + panelWidth > vw - 12) left = vw - panelWidth - 12;
  const top = triggerRect.bottom + 4;
  const maxHeight = vh - top - 16;

  const cols: { item: NavItemSimple; groups: { subgroup?: string; leaves: NavLeaf[] }[] }[] =
    section.items.map(item => ({ item: item as NavItemSimple, groups: flattenItems(item as NavItemSimple) }));

  const colCount = Math.min(cols.length, 3);

  return (
    <div
      className="fixed z-[300] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl overflow-hidden"
      style={{ top, left, width: panelWidth, maxHeight }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{section.group}</span>
      </div>

      {/* Grid of items */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: maxHeight - 44 }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {cols.map(({ item, groups }) => {
            const isLeaf = !item.subitems && !item.subgroups;
            if (isLeaf) {
              const active = isActive((item as NavLeaf).href, pathname);
              return (
                <Link
                  key={(item as NavLeaf).href}
                  href={(item as NavLeaf).href}
                  onClick={onClose}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.label} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
                <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {item.label}
                </div>
                {groups.map((g, gi) => (
                  <div key={gi}>
                    {g.subgroup && (
                      <div className="mt-1 px-1 text-[9px] font-semibold uppercase tracking-widest text-slate-300 dark:text-slate-600">
                        {g.subgroup}
                      </div>
                    )}
                    {g.leaves.map(leaf => {
                      const active = isActive(leaf.href, pathname);
                      return (
                        <Link
                          key={leaf.href}
                          href={leaf.href}
                          onClick={onClose}
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                            active
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {active && <span className="h-1 w-1 rounded-full bg-blue-500 flex-shrink-0" />}
                          {leaf.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TopNavBar ─────────────────────────────────────────────────────────────────
export function TopNavBar({ NAV, pathname, navIcons: _navIcons }: Props) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => { setActiveGroup(null); setTriggerRect(null); }, 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function openGroup(group: string, e: React.MouseEvent<HTMLButtonElement>) {
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    setTriggerRect(rect);
    setActiveGroup(group);
  }

  function closeGroup() {
    setActiveGroup(null);
    setTriggerRect(null);
  }

  const activeSection = NAV.find(s => s.group === activeGroup) ?? null;

  function groupHasActive(section: NavSection) {
     
    function check(item: any): boolean {
      if ('href' in item && isActive((item as NavLeaf).href, pathname)) return true;
      if (item.subitems) return item.subitems.some((l: any) => isActive(l.href, pathname));
      if (item.subgroups) return item.subgroups.some((sg: any) => sg.items.some((l: any) => isActive(l.href, pathname)));
      return false;
    }
    return section.items.some(check);
  }

  return (
    <>
      <nav
        className="flex h-10 flex-shrink-0 items-center gap-0.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 overflow-x-auto"
        onMouseLeave={scheduleClose}
      >
        {NAV.map(section => {
          const active = groupHasActive(section);
          const open = activeGroup === section.group;
          return (
            <button
              key={section.group}
              onMouseEnter={e => openGroup(section.group, e)}
              onClick={e => { if (open) { closeGroup(); } else { openGroup(section.group, e); } }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                open
                  ? 'bg-blue-600 text-white'
                  : active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >

              {section.group}
              <svg
                className={`h-3 w-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          );
        })}
      </nav>

      {activeSection && triggerRect && (
        <MegaDropdown
          section={activeSection}
          pathname={pathname}
          triggerRect={triggerRect}
          onClose={scheduleClose}
          onKeepOpen={cancelClose}
        />
      )}
    </>
  );
}
