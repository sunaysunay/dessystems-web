"use client";
import { useState, useEffect } from "react";
import { SCREEN_REGISTRY } from "@/lib/screen-registry";

export type NavLeaf     = { label: string; href: string };
export type NavSubGroup = { subgroup: string; items: NavLeaf[] };
export type NavItem     = NavLeaf | { label: string; href: string; subgroups: NavSubGroup[] } | { label: string; subitems: NavLeaf[] };
export type NavSection  = { group: string; items: NavItem[] };

type DbRow = { screen_id: string; route: string; title: string; nav_group: string; nav_subgroup: string | null; nav_order: number; nav_visible: boolean };
type ApiTree = Record<string, Record<string, DbRow[]>>;

const GROUP_ORDER = ["overview","operations","salesCrm","marketplace","sales","finance","intelligence","masterData","tools","system"];
const GROUP_LABELS: Record<string, string> = {
  overview:"Overview", operations:"Operations", salesCrm:"Sales & CRM",
  marketplace:"Marketplace", sales:"Sales", finance:"Finance",
  intelligence:"Intelligence", masterData:"Master Data", tools:"Tools", system:"System",
};
const SUBGROUP_PARENT: Record<string, string> = {
  overview: "/console/anl/overview",
  system:   "/console/sys/dashboard",
};
const SUBGROUP_PARENT_LABEL: Record<string, string> = {
  overview: "Detailed Reports",
};
const SUBGROUP_LABELS: Record<string, string> = {
  development: "Development",
  integration: "Integration",
  users:        "Users",
  accessRoles:  "Access Roles",
  configuration:"Configuration",
  infrastructure:"Infrastructure",
  dataAcquisition:"Data Acquisition",
};

// Groups whose subgroups render as AdminSubMenu (subitems) not AnalyticsNav (subgroups)
const SUBMENU_GROUPS = new Set(["system"]);

function lbl(route: string, title: string): string {
  return SCREEN_REGISTRY[route]?.title ?? title;
}

function buildSections(tree: ApiTree): NavSection[] {
  return GROUP_ORDER.flatMap(group => {
    const submap = tree[group];
    if (!submap) return [];

    const rootRows = submap["__root__"] ?? [];
    // suppress a root item that duplicates the subgroup parent link (BO002 artifact)
    const parentRoute = SUBGROUP_PARENT[group];
    const rootRowsClean = (parentRoute ? rootRows.filter(r => r.route !== parentRoute) : rootRows).filter(r => !r.route.includes("["));
    const subgroups = Object.keys(submap).filter(k => k !== "__root__");
    const items: NavItem[] = rootRowsClean.map(r => ({ label: lbl(r.route, r.title), href: r.route }));

    if (subgroups.length > 0) {
      if (SUBMENU_GROUPS.has(group)) {
        // Render each subgroup as AdminSubMenu (subitems)
        subgroups.forEach(sg => {
          items.push({
            label: SUBGROUP_LABELS[sg] ?? sg,
            subitems: (submap[sg] ?? []).map(r => ({ label: lbl(r.route, r.title), href: r.route })),
          });
        });
      } else {
        // Render as AnalyticsNav (subgroups with parent href)
        items.push({
          label: SUBGROUP_PARENT_LABEL[group] ?? GROUP_LABELS[group] ?? group,
          href: SUBGROUP_PARENT[group] ?? `/${group}`,
          subgroups: subgroups.map(sg => ({
            subgroup: SUBGROUP_LABELS[sg] ?? sg,
            items: (submap[sg] ?? []).map(r => ({ label: lbl(r.route, r.title), href: r.route })),
          })),
        });
      }
    }

    return [{ group: GROUP_LABELS[group] ?? group, items }];
  });
}

const NAV_CACHE_KEY = "bop_nav_cache_v2";

export function useNav(): NavSection[] {
  // Initialise from the last-known DB nav cached in localStorage so the first
  // client paint shows the real menu instead of the stale hardcoded fallback.
  const [sections, setSections] = useState<NavSection[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(NAV_CACHE_KEY);
      if (cached) return JSON.parse(cached) as NavSection[];
    } catch { /* ignore */ }
    return [];
  });
  useEffect(() => {
    fetch("/api/bop/nav")
      .then(r => r.json())
      .then(({ tree }: { tree: ApiTree }) => {
        const built = buildSections(tree);
        setSections(built);
        try { localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(built)); } catch { /* ignore */ }
      })
      .catch(() => {});
  }, []);
  return sections;
}
