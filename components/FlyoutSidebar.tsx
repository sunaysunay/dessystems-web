'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { navIcon } from '@/components/NavIcons';
import { SCREEN_REGISTRY } from '@/lib/screen-registry';

type NavLeaf = { label: string; href: string; disabled?: boolean; v3?: boolean };
type NavSubGroup = { subgroup: string; items: NavLeaf[] };
type NavItem =
  | NavLeaf
  | { label: string; href: string; subgroups: NavSubGroup[] }
  | { label: string; subitems: NavLeaf[] };
type NavSection = { group: string; items: NavItem[] };

interface Props {
  NAV: NavSection[];
  pathname: string;
  navIcons: boolean;
  flyoutGroup: string | null;
  setFlyoutGroup: (g: string | null) => void;
  onHide: () => void;
  navPosition?: 'left' | 'right';
}

function isLeaf(item: NavItem): item is NavLeaf {
  return 'href' in item && !('subgroups' in item) && !('subitems' in item);
}

function getLeaves(item: NavItem): NavLeaf[] {
  if (isLeaf(item)) return [item];
  if ('subitems' in item) return item.subitems;
  if ('subgroups' in item) return item.subgroups.flatMap(sg => sg.items);
  return [];
}

function sectionActive(section: NavSection, pathname: string) {
  return section.items.some(item =>
    getLeaves(item).some(l => pathname === l.href || pathname.startsWith(l.href + '/'))
  );
}

function itemActive(item: NavItem, pathname: string): boolean {
  return getLeaves(item).some(l => pathname === l.href || pathname.startsWith(l.href + '/'));
}

// ── Compute fixed position — flips upward when near bottom of viewport ─────────
type PosResult = { top?: number; bottom?: number; left?: number; right?: number; maxHeight: number };
function computePos(triggerRect: DOMRect, direction: 'right' | 'left'): PosResult {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 8;
  const MIN_DOWN = 160; // prefer downward if at least this many px available below

  const spaceBelow = vh - triggerRect.top - MARGIN;
  const spaceAbove = triggerRect.bottom - MARGIN;
  const flipUp = spaceBelow < MIN_DOWN && spaceAbove > spaceBelow;

  let top: number | undefined;
  let bottom: number | undefined;
  let maxHeight: number;

  if (flipUp) {
    // Anchor bottom-edge of popup to the trigger's bottom; grow upward
    bottom = vh - triggerRect.bottom;
    maxHeight = Math.min(spaceAbove, Math.round(vh * 0.8));
  } else {
    top = Math.max(MARGIN, triggerRect.top);
    maxHeight = vh - top - MARGIN;
  }

  const horiz = direction === 'right'
    ? { left: triggerRect.right + 4 }
    : { right: vw - triggerRect.left + 4 };

  return { top, bottom, ...horiz, maxHeight };
}

// ── Shared leaf link ─────────────────────────────────────────────────────────
function LeafLink({ item, pathname, onClick }: { item: NavLeaf; pathname: string; onClick?: () => void }) {
  const active = pathname === item.href || pathname.startsWith(item.href + '/');
  const reg = SCREEN_REGISTRY[item.href];
  if (item.disabled || item.v3) {
    return (
      <span className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] opacity-40 cursor-not-allowed select-none text-slate-400">
        {navIcon(item.href)}
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">V3</span>
      </span>
    );
  }
  return (
    <Link href={item.href} onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
      }`}>
      {navIcon(item.href)}
      <span className="flex-1 truncate">{item.label}</span>
      {reg && <span className={`ml-auto font-mono text-[9px] ${active ? 'text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>{reg.id}</span>}
    </Link>
  );
}

// ── Item submenu: fixed popup anchored to a specific row ─────────────────────
interface SubMenuProps {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  direction: 'right' | 'left';
  triggerRect: DOMRect;
  onClose: () => void;
  onKeepOpen?: () => void;
}

function ItemSubMenu({ item, pathname, onNavigate, direction, triggerRect, onClose, onKeepOpen }: SubMenuProps) {
  const leaves: { subgroup?: string; items: NavLeaf[] }[] =
    'subitems' in item && item.subitems
      ? [{ items: item.subitems }]
      : 'subgroups' in item && item.subgroups
        ? item.subgroups.map(sg => ({ subgroup: sg.subgroup, items: sg.items }))
        : [];

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pos = computePos(triggerRect, direction);

  function toggleGroup(label: string) {
    setCollapsed(c => ({ ...c, [label]: !c[label] }));
  }

  return (
    <div
      className="fixed z-[200] w-[240px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 overflow-y-auto"
      style={{ top: pos.top, bottom: pos.bottom, left: (pos as any).left, right: (pos as any).right, maxHeight: pos.maxHeight }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      {leaves.map((group, gi) => {
        const isCollapsed = group.subgroup ? (collapsed[group.subgroup] ?? false) : false;
        return (
          <div key={gi}>
            {group.subgroup ? (
              <button
                onClick={() => toggleGroup(group.subgroup!)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group.subgroup}
                </span>
                <svg className={`h-3 w-3 text-slate-300 dark:text-slate-600 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : null}
            {!isCollapsed && (
              <ul>
                {group.items.map(leaf => (
                  <li key={leaf.href}>
                    <LeafLink item={leaf} pathname={pathname} onClick={onNavigate} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── A single row inside the group panel ─────────────────────────────────────
function SidebarRow({
  item, pathname, direction, onNavigate,
}: {
  item: NavItem; pathname: string; direction: 'right' | 'left'; onNavigate: () => void;
}) {
  const [openRect, setOpenRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = itemActive(item, pathname);

  function scheduleClose() { closeTimer.current = setTimeout(() => setOpenRect(null), 80); }
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }

  if (isLeaf(item)) {
    return <li><LeafLink item={item} pathname={pathname} onClick={onNavigate} /></li>;
  }

  const label = item.label;
  const href = 'href' in item ? (item as any).href as string | undefined : undefined;

  return (
    <li className="relative">
      <button
        ref={btnRef}
        onMouseEnter={() => {
          cancelClose();
          if (btnRef.current) setOpenRect(btnRef.current.getBoundingClientRect());
        }}
        onMouseLeave={scheduleClose}
        onClick={() => {
          if (openRect) { scheduleClose(); }
          else if (btnRef.current) setOpenRect(btnRef.current.getBoundingClientRect());
        }}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
          active
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        {href && navIcon(href)}
        <span className="flex-1 truncate text-left">{label}</span>
        <svg className={`h-3 w-3 flex-shrink-0 opacity-50 ${direction === 'left' ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {openRect && (
        <ItemSubMenu
          item={item}
          pathname={pathname}
          onNavigate={() => { setOpenRect(null); onNavigate(); }}
          direction={direction}
          triggerRect={openRect}
          onClose={scheduleClose}
          onKeepOpen={cancelClose}
        />
      )}
    </li>
  );
}

// ── Group panel: fixed popup anchored to the hovered group button ─────────────
function GroupPanel({
  section, pathname, direction, onClose, triggerRect, onKeepOpen,
}: {
  section: NavSection; pathname: string; direction: 'right' | 'left';
  onClose: () => void; triggerRect: DOMRect; onKeepOpen?: () => void;
}) {
  const pos = computePos(triggerRect, direction);

  return (
    <div
      className="fixed z-[150] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-lg overflow-hidden"
      style={{
        width: 240,
        top: pos.top,
        bottom: pos.bottom,
        left: (pos as any).left,
        right: (pos as any).right,
        maxHeight: pos.maxHeight,
      }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {section.group}
        </span>
        <button onClick={onClose}
          className="rounded p-0.5 text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* items */}
      <ul className="overflow-y-auto space-y-0.5 px-2 py-2">
        {section.items.map((item, idx) => (
          <SidebarRow
            key={isLeaf(item) ? item.href : idx}
            item={item}
            pathname={pathname}
            direction={direction}
            onNavigate={onClose}
          />
        ))}
      </ul>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function FlyoutSidebar({ NAV, pathname, navIcons, flyoutGroup, setFlyoutGroup, onHide, navPosition = 'left' }: Props) {
  const activeSection = NAV.find(s => s.group === flyoutGroup) ?? null;
  const panelDirection: 'right' | 'left' = navPosition === 'right' ? 'left' : 'right';

  // Store the bounding rect of the specific group button that was last hovered
  const [activeBtnRect, setActiveBtnRect] = useState<DOMRect | null>(null);

  // Delay timers so mouse can travel between rail and panel
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleClose() { closeTimer.current = setTimeout(() => { setFlyoutGroup(null); setActiveBtnRect(null); }, 120); }
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }

  function openGroup(group: string, btnEl: HTMLElement) {
    cancelClose();
    setActiveBtnRect(btnEl.getBoundingClientRect());
    setFlyoutGroup(group);
  }

  return (
    <>
      {/* ── Label rail ── */}
      <div
        className="flex h-full w-44 flex-col flex-shrink-0 overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/50 px-2 py-3 gap-0.5"
        onMouseLeave={scheduleClose}
      >
        {NAV.map(section => {
          const isActive = sectionActive(section, pathname);
          const isOpen = flyoutGroup === section.group;
          const firstLeaf = getLeaves(section.items[0])?.[0];
          const singleLeaf = section.items.length === 1 && isLeaf(section.items[0]) ? section.items[0] : null;

          if (singleLeaf) {
            const active = pathname === singleLeaf.href || pathname.startsWith(singleLeaf.href + '/');
            return (
              <Link key={section.group} href={singleLeaf.href}
                onMouseEnter={() => { cancelClose(); setFlyoutGroup(null); }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }`}>
                {navIcons && firstLeaf && <span className="flex-shrink-0">{navIcon(singleLeaf.href)}</span>}
                <span className="flex-1 truncate">{section.group}</span>
              </Link>
            );
          }

          return (
            <button
              key={section.group}
              onMouseEnter={e => openGroup(section.group, e.currentTarget)}
              onClick={e => isOpen ? (setFlyoutGroup(null), setActiveBtnRect(null)) : openGroup(section.group, e.currentTarget)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors text-left ${
                isOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : isActive
                    ? 'text-indigo-500 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {navIcons && firstLeaf && <span className="flex-shrink-0">{navIcon(firstLeaf.href)}</span>}
              <span className="flex-1 truncate">{section.group}</span>
              <svg className={`h-3 w-3 flex-shrink-0 opacity-40 ${panelDirection === 'left' ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
              {isActive && !isOpen && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
            </button>
          );
        })}

        {/* hide button */}
        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button onClick={onHide} title="Hide menu"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Group panel — positioned next to the hovered group button ── */}
      {activeSection && activeBtnRect && (
        <GroupPanel
          section={activeSection}
          pathname={pathname}
          direction={panelDirection}
          triggerRect={activeBtnRect}
          onClose={scheduleClose}
          onKeepOpen={cancelClose}
        />
      )}
    </>
  );
}
