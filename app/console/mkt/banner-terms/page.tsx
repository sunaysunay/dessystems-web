// MK009 — USP Banner Terms
// app/console/mkt/banner-terms/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { ScreenHeader } from "@/components/ScreenBadge";

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform ${open ? "rotate-180" : ""}`}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Inlined locale data ───────────────────────────────────────────────────────

const EN_FALLBACK = [
  { key: "inspection", label: "RDW Approved",          href: "/inspection" },
  { key: "showroom",   label: "Showroom Roosendaal",   href: "/contact"    },
  { key: "tax",        label: "Margin Scheme Tax",     href: "/tax-scheme" },
  { key: "markets",    label: "Delivery NL · BE · DE", href: "/delivery"   },
  { key: "warranty",   label: "12 Month Warranty",     href: "/warranty"   },
];

const LOCALE_DATA: Record<string, { key: string; label: string; href: string }[]> = {
  "nl-NL": [
    { key: "inspection", label: "RDW Keuring Ready",     href: "/keuring"   },
    { key: "showroom",   label: "Showroom Roosendaal",   href: "/contact"   },
    { key: "tax",        label: "BTW Margeregeling",     href: "/btw-marge" },
    { key: "markets",    label: "Levering NL · BE · DE", href: "/levering"  },
    { key: "warranty",   label: "12 Maanden Garantie",   href: "/garantie"  },
  ],
  "nl-BE": [
    { key: "inspection", label: "Keuring Klaar",          href: "/keuring"   },
    { key: "showroom",   label: "Showroom Roosendaal",    href: "/contact"   },
    { key: "tax",        label: "BTW Margeregeling",      href: "/btw-marge" },
    { key: "markets",    label: "Levering NL · BE · DE",  href: "/levering"  },
    { key: "warranty",   label: "12 Maanden Garantie",    href: "/garantie"  },
  ],
  "fr-BE": [
    { key: "inspection", label: "Contrôle technique OK",  href: "/controle"  },
    { key: "showroom",   label: "Showroom Roosendaal",    href: "/contact"   },
    { key: "tax",        label: "Régime TVA Marge",       href: "/tva-marge" },
    { key: "markets",    label: "Livraison NL · BE · DE", href: "/livraison" },
    { key: "warranty",   label: "Garantie 12 Mois",       href: "/garantie"  },
  ],
  "de-DE": [
    { key: "inspection", label: "TÜV / HU geprüft",          href: "/de/pruefung"        },
    { key: "showroom",   label: "Showroom Roosendaal",        href: "/de/kontakt"         },
    { key: "tax",        label: "§25a Differenzbesteuerung",  href: "/de/differenzsteuer" },
    { key: "markets",    label: "Lieferung NL · BE · DE",     href: "/de/lieferung"       },
    { key: "warranty",   label: "12 Monate Garantie",         href: "/de/garantie"        },
  ],
  "en":    EN_FALLBACK,
  "tr-TR": EN_FALLBACK,
  "ro-RO": EN_FALLBACK,
  "bg-BG": EN_FALLBACK,
  "el-GR": EN_FALLBACK,
  "es-ES": EN_FALLBACK,
  "it-IT": EN_FALLBACK,
};

const LOCALES = [
  { code: "nl-NL", flag: "🇳🇱", label: "Nederlands",      market: "Netherlands" },
  { code: "nl-BE", flag: "🇧🇪", label: "Nederlands (BE)", market: "Belgium"     },
  { code: "fr-BE", flag: "🇧🇪", label: "Français (BE)",   market: "Belgium"     },
  { code: "de-DE", flag: "🇩🇪", label: "Deutsch",         market: "Germany"     },
  { code: "tr-TR", flag: "🇹🇷", label: "Türkçe",          market: "Turkey"      },
  { code: "ro-RO", flag: "🇷🇴", label: "Română",          market: "Romania"     },
  { code: "bg-BG", flag: "🇧🇬", label: "Български",       market: "Bulgaria"    },
  { code: "el-GR", flag: "🇬🇷", label: "Ελληνικά",        market: "Greece"      },
  { code: "es-ES", flag: "🇪🇸", label: "Español",         market: "Spain"       },
  { code: "it-IT", flag: "🇮🇹", label: "Italiano",        market: "Italy"       },
  { code: "en",    flag: "🌐", label: "English",          market: "Fallback"    },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Override = {
  id: number;
  term_key: string;
  locale: string;
  label_override: string | null;
  override_updated_at: string | null;
  override_updated_by: string | null;
};

type RowState = {
  key: string;
  fileLabel: string;
  href: string;
  override: Override | null;
  draft: string;
  editing: boolean;
  saving: boolean;
};

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Locale dropdown ───────────────────────────────────────────────────────────

function LocaleDropdown({
  value,
  onChange,
  overrides,
}: {
  value: string;
  onChange: (code: string) => void;
  overrides: Override[];
}) {
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.code === value)!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="text-[16px] leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <span className="ml-1 text-[11px] text-slate-400">{current.market}</span>
        <span className="ml-1 text-slate-400"><ChevronDown open={open} /></span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {LOCALES.map(({ code, flag, label, market }) => {
              const active = code === value;
              const hasOverride = overrides.some(
                (o) => o.locale === code && o.label_override,
              );
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => { onChange(code); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    active ? "bg-fuchsia-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[16px] leading-none">{flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-medium ${active ? "text-fuchsia-700" : "text-slate-700"}`}>
                      {label}
                    </div>
                    <div className="text-[11px] text-slate-400">{market}</div>
                  </div>
                  {active && <span className="text-fuchsia-500 shrink-0"><CheckIcon /></span>}
                  {hasOverride && !active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shrink-0" title="Has overrides" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BannerTermsPage() {
  const [activeLocale, setActiveLocale] = useState("nl-NL");
  const [overrides, setOverrides]       = useState<Override[]>([]);
  const [loadingOvr, setLoadingOvr]     = useState(true);
  const [rows, setRows]                 = useState<RowState[]>([]);
  const [toast, setToast]               = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  async function loadOverrides() {
    const res = await fetch("/api/bop/banner-terms").catch(() => null);
    if (res?.ok) setOverrides(await res.json());
    setLoadingOvr(false);
  }

  useEffect(() => { void loadOverrides(); }, []);

  useEffect(() => {
    const items = LOCALE_DATA[activeLocale] ?? [];
    setRows(
      items.map((item) => {
        const ovr = overrides.find(
          (o) => o.term_key === item.key && o.locale === activeLocale,
        ) ?? null;
        return {
          key: item.key, fileLabel: item.label, href: item.href,
          override: ovr, draft: ovr?.label_override ?? item.label,
          editing: false, saving: false,
        };
      }),
    );
  }, [activeLocale, overrides]);

  function patchRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveOverride(row: RowState, value: string | null) {
    patchRow(row.key, { saving: true });
    const id = row.override?.id;
    const res = await fetch(
      id ? `/api/bop/banner-terms/${id}` : `/api/bop/banner-terms`,
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term_key: row.key, locale: activeLocale,
          label_override: value, updated_by: "admin",
        }),
      },
    ).catch(() => null);

    if (res?.ok) {
      await loadOverrides();
      showToast(value ? "Override saved." : "Cleared — using file label.");
    } else {
      showToast("Save failed. Check API logs.");
    }
    patchRow(row.key, { saving: false, editing: false });
  }

  const activeOverrideCount = rows.filter((r) => r.override?.label_override).length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px]">

      <ScreenHeader
        title="USP Banner Terms"
        description="Per-locale labels for the USP bar shown on every Desmobil page. Overrides take effect immediately — no redeploy needed."
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <LocaleDropdown
          value={activeLocale}
          onChange={setActiveLocale}
          overrides={overrides}
        />

        <div className="flex items-center gap-3">
          {activeOverrideCount > 0 && (
            <span className="text-[12px] text-slate-500">
              {activeOverrideCount} override{activeOverrideCount !== 1 ? "s" : ""} active
            </span>
          )}
          {toast && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700">
              {toast}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-[110px] px-5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Key
              </th>
              <th className="px-5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                File label
                <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-300">
                  (git source)
                </span>
              </th>
              <th className="px-5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Override
                <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-300">
                  (what visitors see · blank = file label)
                </span>
              </th>
              <th className="w-[130px] px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const { key, fileLabel, override, draft, editing, saving } = row;
              const hasOverride = !!override?.label_override;
              const lastEdit = fmt(override?.override_updated_at ?? null);

              return (
                <tr key={key} className="transition-colors hover:bg-slate-50/60">

                  <td className="px-5 py-3.5 align-middle">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                      {key}
                    </code>
                  </td>

                  <td className="px-5 py-3.5 align-middle text-slate-500">
                    {fileLabel}
                  </td>

                  <td className="px-5 py-3.5 align-middle">
                    {editing ? (
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => patchRow(key, { draft: e.target.value })}
                        autoFocus
                        maxLength={120}
                        placeholder={fileLabel}
                        className="w-full rounded-lg border border-fuchsia-300 bg-white px-3 py-1.5 text-[13px] text-slate-800 shadow-sm outline-none ring-2 ring-fuchsia-100 focus:border-fuchsia-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") startTransition(() => saveOverride(row, draft.trim() || null));
                          if (e.key === "Escape") patchRow(key, { editing: false, draft: override?.label_override ?? fileLabel });
                        }}
                      />
                    ) : hasOverride ? (
                      <div>
                        <span className="font-semibold text-fuchsia-600">
                          {override!.label_override}
                        </span>
                        {lastEdit && (
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {override!.override_updated_by ?? "admin"} · {lastEdit}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px] italic text-slate-300">
                        — using file label
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            disabled={saving || isPending}
                            onClick={() => startTransition(() => saveOverride(row, draft.trim() || null))}
                            className="rounded-md bg-fuchsia-600 px-3 py-1 text-[11.5px] font-semibold text-white transition hover:bg-fuchsia-700 disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => patchRow(key, { editing: false, draft: override?.label_override ?? fileLabel })}
                            className="rounded-md px-3 py-1 text-[11.5px] text-slate-400 transition hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => patchRow(key, { editing: true })}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[11.5px] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                          >
                            Edit
                          </button>
                          {hasOverride && (
                            <button
                              type="button"
                              title="Revert to file label"
                              onClick={() => startTransition(() => saveOverride(row, null))}
                              className="rounded-md px-2 py-1 text-[11.5px] text-slate-400 transition hover:text-red-500"
                            >
                              Clear
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {loadingOvr && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[13px] text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11.5px] text-slate-400">
        Overrides stored in <code className="text-[11px]">banner_terms_log</code>.
        Clearing reverts to the git file label with no redeploy.
        Press <kbd className="rounded border border-slate-200 px-1 text-[10px]">F1</kbd> for full documentation.
      </p>
    </div>
  );
}
