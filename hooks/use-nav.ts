"use client";
import { useState, useEffect } from "react";
import { SCREEN_REGISTRY } from "@/lib/screen-registry";

export type NavLeaf     = { label: string; href: string };
export type NavSubGroup = { subgroup: string; items: NavLeaf[] };
export type NavItem     = NavLeaf | { label: string; href: string; subgroups: NavSubGroup[] } | { label: string; subitems: NavLeaf[] };
export type NavSection  = { group: string; items: NavItem[] };

type DbRow = { screen_id: string; route: string; title: string; nav_group: string; nav_subgroup: string | null; nav_order: number; nav_visible: boolean };
type ApiTree = Record<string, Record<string, DbRow[]>>;
type Tg = (key: string) => string;

const GROUP_ORDER = ["overview","operations","workshop","sales","marketing","finance","intelligence","shop","tools","system"];

// nav_group value → messages/*.json "groups" key
const GROUP_KEY: Record<string, string> = {
  sales: "salesCrm",
  marketing: "marketingChannels",
};

// nav_subgroup value → "groups" key
const SUBGROUP_KEY: Record<string, string> = {
  "1_masterdata":  "shopCatalog",
  "2_procurement": "shopProcurement",
  "3_warehouse":   "shopWarehouse",
  "4_sales":       "shopOrdersMgmt",
  "5_shipping":    "shopShipping",
  "6_finance":     "shopFinanceGrp",
  "7_aftersales":  "shopAfterSalesGrp",
  "8_compliance":  "shopComplianceGrp",
  "9_analytics":   "shopAnalyticsGrp",
};

// Groups rendered as one parent link with collapsible subgroups (AnalyticsNav)
const SUBGROUP_PARENT: Record<string, { href: string; labelKey: string }> = {
  overview: { href: "/console/anl/overview", labelKey: "detailedReports" },
  shop:     { href: "/console/shp",          labelKey: "shopModules" },
};

// Groups whose subgroups render as accordion sub-menus (AdminSubMenu)
const SUBMENU_GROUPS = new Set(["system", "sales", "marketing", "operations"]);

function lbl(route: string, title: string): string {
  return SCREEN_REGISTRY[route]?.title ?? title;
}

function buildSections(tree: ApiTree, tg: Tg): NavSection[] {
  return GROUP_ORDER.flatMap(group => {
    const submap = tree[group];
    if (!submap) return [];

    const parent = SUBGROUP_PARENT[group];
    const rootRows = (submap["__root__"] ?? [])
      .filter(r => !r.route.includes("["))
      .filter(r => !parent || r.route !== parent.href);
    const subgroups = Object.keys(submap).filter(k => k !== "__root__").sort();
    const items: NavItem[] = rootRows.map(r => ({ label: lbl(r.route, r.title), href: r.route }));
    const sgLabel = (sg: string) => tg(SUBGROUP_KEY[sg] ?? sg);
    const leaves = (sg: string) => (submap[sg] ?? []).filter(r => !r.route.includes("[")).map(r => ({ label: lbl(r.route, r.title), href: r.route }));

    if (subgroups.length > 0) {
      if (SUBMENU_GROUPS.has(group)) {
        subgroups.forEach(sg => items.push({ label: sgLabel(sg), subitems: leaves(sg) }));
      } else {
        items.push({
          label: tg(parent?.labelKey ?? GROUP_KEY[group] ?? group),
          href: parent?.href ?? `/console/${group}`,
          subgroups: subgroups.map(sg => ({ subgroup: sgLabel(sg), items: leaves(sg) })),
        });
      }
    }

    return [{ group: tg(GROUP_KEY[group] ?? group), items }];
  });
}

const NAV_CACHE_KEY = "bop_nav_cache_v3";

export function useNav(tg: Tg): NavSection[] {
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
        const built = buildSections(tree, tg);
        setSections(built);
        try { localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(built)); } catch { /* ignore */ }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sections;
}
