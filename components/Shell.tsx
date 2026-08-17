'use client';
import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useScope } from "@/lib/scope-context";
import { signOut } from '@/lib/auth';
import { ScreenBadge } from '@/components/ScreenBadge';
import { SCREEN_REGISTRY, getScreen } from '@/lib/screen-registry';
import { DEALER_TEMPLATE, DEALER_ROLES } from '@/lib/my-work';
import { useNav } from '@/hooks/use-nav';
import { navIcon } from '@/components/NavIcons';
import { BopSelect } from '@/components/BopSelect';
// import { HelpMenu } from '@/components/HelpMenu';  // unused — bop-inspect
import { SystemMenu } from '@/components/SystemMenu';
import { AICopilot } from '@/components/AICopilot';
import { SupportDrawer } from '@/components/SupportDrawer';
import { FlyoutSidebar } from '@/components/FlyoutSidebar';
import { TopNavBar } from '@/components/TopNavBar';

// Nav item types
type NavLeaf = { label: string; href: string; disabled?: boolean; v3?: boolean };
type NavSubGroup = { subgroup: string; items: NavLeaf[] };
type NavItem = NavLeaf | { label: string; href: string; subgroups: NavSubGroup[] } | { label: string; subitems: NavLeaf[] };
type NavSection = { group: string; items: NavItem[] };

function makeNav(tn: (k: string) => string, tg: (k: string) => string): NavSection[] {
  return [
  { group: tg('overview'), items: [
    { label: tn('dashboard'),       href: '/console' },
    {
      label: tn('analytics'), href: '/console/anl/overview',
      subgroups: [
        { subgroup: tg('live'),       items: [{ label: tn('realtime'),          href: '/console/anl/realtime' }] },
        { subgroup: tg('listings'),   items: [
          { label: tn('performance'),   href: '/console/anl/performance' },
          { label: tn('topViewed'),    href: '/console/anl/top-viewed' },
          { label: tn('viewEvents'),   href: '/console/anl/view-events' },
        ]},
        { subgroup: tg('traffic'),    items: [
          { label: tn('pageViews'),    href: '/console/anl/page-views' },
          { label: tn('visitors'),      href: '/console/anl/visitors' },
          { label: tn('sources'),       href: '/console/anl/sources' },
          { label: tn('topPages'),     href: '/console/anl/top-pages' },
          { label: tn('ga4'),           href: '/console/anl/ga4' },
          { label: tn('cloudflare'),    href: '/console/anl/cloudflare' },
          { label: tn('cfGaCompare'), href: '/console/anl/cf-ga-compare' },
        ]},
        { subgroup: tg('audience'),   items: [
          { label: tn('locations'),     href: '/console/anl/locations' },
          { label: tn('devices'),       href: '/console/anl/devices' },
        ]},
        { subgroup: tg('sessions'),   items: [
          { label: tn('sessionsAdm'),      href: '/console/anl/sessions' },
          { label: tn('sessionsTrack'),href: '/console/anl/sessions-track' },
        ]},
        { subgroup: tg('events'),     items: [
          { label: tn('formSubmits'),  href: '/console/anl/form-submits' },
          { label: tn('clickEvents'),  href: '/console/anl/click-events' },
          { label: tn('clickAnalytics'),href: '/console/anl/click-analytics' },
          { label: tn('errors404'),    href: '/console/anl/404-errors' },
          { label: tn('recentActivity'),href: '/console/anl/recent-activity' },
        ]},
        { subgroup: tg('security'),   items: [
          { label: tn('securityEvents'),href: '/console/anl/security-events' },
          { label: tn('logFilters'),   href: '/console/anl/log-filters' },
        ]},
      ],
    },
  ]},

  { group: tg('operations'), items: [
    { label: tn('inventory'),         href: '/console/ast/inventory' },
    { label: tn('catalog'),           href: '/console/ast/catalog' },
    { label: tn('brands'),            href: '/console/ast/brands' },
    { label: tn('categories'),        href: '/console/ast/categories' },
    { label: tn('suppliers'),         href: '/console/ast/suppliers' },
    { label: tn('structures'),        href: '/console/ast/structures' },
    { label: tn('lifecycleBoard'),    href: '/console/ast/lifecycle' },
    { label: tn('costTracker'),       href: '/console/ast/costs' },
    { label: tn('costManager'),      href: '/console/inventory/costs',        v3: true },
    { label: tn('inspections'),       href: '/console/inventory/inspections',  v3: true },
    { label: tn('transport'),         href: '/console/operations/transport',   v3: true },
    { label: tn('workOrders'),       href: '/console/operations/work-orders', v3: true },
  ]},

  { group: tg('salesCrm'), items: [
    { label: tn('crmPipeline'),      href: '/console/crm/overview' },
    { label: tn('crmLegacy'),       href: '/console/crm/legacy' },
    { label: tn('leads'),             href: '/console/crm/leads' },
    { label: tn('appointments'),      href: '/console/sal/appointments' },
    { label: tn('reviews'),           href: '/console/sal/reviews' },
    { label: tn('rentals'),           href: '/console/sal/rentals' },
    { label: tn('customer360'),      href: '/console/crm/customers' },
    { label: tn('activities'),        href: '/console/crm/activities' },
    { label: tn('pipelineKanban'),   href: '/console/crm/kanban' },
  ]},

  { group: tg('marketplace'), items: [
    { label: tn('listingManager'),   href: '/console/mkp/listings' },
    { label: tn('listingsNav'),          href: '/console/mkp/channel-listings' },
    { label: tn('publishListing'),   href: '/console/mkp/publish' },
    { label: tn('publishQueue'),     href: '/console/pub/queue' },
    { label: tn('publications'),      href: '/console/pub/overview' },
    { label: tn('channelAnalytics'), href: '/console/mkp/analytics',  v3: true },
    { label: tn('auctionManager'),   href: '/console/mkp/auctions' },
    { label: tn('layoutManager'),    href: '/console/mkp/layout-manager' },
  ]},

  { group: tg('sales'), items: [
    { label: tn('quotations'),        href: '/console/sal/quotations' },
    { label: tn('sellLeads'),         href: '/console/sal/sell-leads' },
    { label: tn('buyerInquiries'),    href: '/console/sal/inquiries' },
    { label: tn('buyerInbox'),        href: '/console/sal/buyer-inbox' },
    { label: tn('quoteBuilder'),     href: '/console/sal/quotes' },
    { label: tn('quotes'),            href: '/console/sal/quote-submissions' },
    { label: tn('orders'),            href: '/console/sal/orders' },
    { label: tn('payments'),          href: '/console/sal/payments' },
    { label: tn('salesDashboard'),   href: '/console/sal/dashboard' },
    { label: tn('ordersBop'),      href: '/console/sales/orders',           v3: true },
    { label: tn('contracts'),         href: '/console/sales/contracts',        v3: true },
    { label: tn('partnerPortal'),    href: '/console/sal/portal',           v3: true },
  ]},

  { group: tg('finance'), items: [
    { label: tn('invoicesAR'),       href: '/console/fin/invoices' },
    { label: tn('invoicesAP'),       href: '/console/fin/ap' },
    { label: tn('paymentTracking'),  href: '/console/fin/payments' },
    { label: tn('btwQuick'),         href: '/console/fin/btw-quick' },
    { label: tn('btwAangifte'),      href: '/console/fin/btw' },
    { label: tn('rapporten'),         href: '/console/fin/reports' },
    { label: tn('facturen'),          href: '/console/fin/facturen' },
    { label: tn('kosten'),            href: '/console/fin/expenses' },
    { label: tn('klanten'),           href: '/console/fin/customers' },
    { label: tn('bonScanner'),       href: '/console/fin/scanner' },
    { label: tn('btwAssistent'),     href: '/console/fin/assistant' },
    { label: tn('winstVerlies'),   href: '/console/fin/pnl' },
    { label: tn('paymentsBop'),    href: '/console/fin/payments',   v3: true },
    { label: tn('arAging'),          href: '/console/finance/bop/aging',      v3: true },
    { label: tn('expensesBop'),    href: '/console/finance/bop/expenses',   v3: true },
  ]},

  { group: tg('intelligence'), items: [
    { label: tn('execDashboard'),    href: '/console/anl/exec-dashboard' },
    { label: tn('marginCalculator'), href: '/console/sal/margin' },
    { label: tn('aiOverview'),       href: '/console/mkt/overview' },
    { label: tn('marketEval'),       href: '/console/mkt/market' },
    { label: tn('competitors'),       href: '/console/mkt/competitors' },
    { label: tn('brandTracker'),     href: '/console/mkt/brands' },
    { label: tn('leadStats'),        href: '/console/crm/lead-stats' },
    { label: tn('listingIntel'),     href: '/console/mkt/listings' },
    { label: tn('aiCampaigns'),      href: '/console/mkt/campaigns' },
    { label: tn('studio'),           href: '/console/mkt/studio' },
    { label: tn('presetBg'),         href: '/console/mkt/studio/preset-backgrounds' },
  ]},

  { group: tg('shop'), items: [
    { label: tn('shopDashboard'),    href: '/console/shp/dashboard' },
    { label: tn('shopMonitor'),      href: '/console/shp/monitor' },
    { label: tn('shopProducts'), href: '/console/shp/products',
      subgroups: [
        { subgroup: tg('shopCatalog'), items: [
          { label: tn('shopProducts'),     href: '/console/shp/products' },
          { label: tn('shopBrands'),       href: '/console/shp/brands' },
          { label: tn('shopInventory'),    href: '/console/shp/inventory' },
          { label: tn('shopDocuments'),    href: '/console/shp/documents' },
          { label: tn('shopCollections'),  href: '/console/shp/collections' },
          { label: tn('shopImport'),       href: '/console/shp/import' },
        ]},
        { subgroup: tg('shopOrdersMgmt'), items: [
          { label: tn('shopOrders'),       href: '/console/shp/orders' },
          { label: tn('shopCustomers'),    href: '/console/shp/customers' },
          { label: tn('shopTracking'),     href: '/console/shp/tracking' },
        ]},
        { subgroup: tg('shopFulfilment'), items: [
          { label: tn('shopFulfilOrders'), href: '/console/shp/fulfil/orders' },
          { label: tn('shopAllocations'),  href: '/console/shp/fulfil/allocations' },
          { label: tn('shopPickLists'),    href: '/console/shp/fulfil/pick' },
          { label: tn('shopPackStation'),  href: '/console/shp/fulfil/pack' },
          { label: tn('shopShipments'),    href: '/console/shp/fulfil/shipments' },
          { label: tn('shopBackorders'),   href: '/console/shp/fulfil/backorders' },
        ]},
        { subgroup: tg('shopProcurement'), items: [
          { label: tn('shopSuppliers'),       href: '/console/shp/procure/suppliers' },
          { label: tn('shopSupplierCatalog'), href: '/console/shp/procure/catalog' },
          { label: tn('shopPurchaseOrders'),  href: '/console/shp/procure/po' },
          { label: tn('shopGoodsReceipt'),    href: '/console/shp/procure/receive' },
          { label: tn('shopCycleCount'),      href: '/console/shp/procure/count' },
          { label: tn('shopDropship'),        href: '/console/shp/procure/dropship' },
        ]},
        { subgroup: tg('shopFinanceGrp'), items: [
          { label: tn('shopVat'),          href: '/console/shp/finance/vat' },
          { label: tn('shopSettlements'),  href: '/console/shp/finance/settlements' },
          { label: tn('shopInvoices'),     href: '/console/shp/finance/invoices' },
          { label: tn('shopCreditNotes'),  href: '/console/shp/finance/credit-notes' },
          { label: tn('shopPayments'),     href: '/console/shp/finance/payments' },
          { label: tn('shopMargin'),       href: '/console/shp/finance/margin' },
        ]},
        { subgroup: tg('shopAfterSalesGrp'), items: [
          { label: tn('shopReturns'),        href: '/console/shp/aftersales/returns' },
          { label: tn('shopClaims'),         href: '/console/shp/aftersales/claims' },
          { label: tn('shopCarrierDamage'),  href: '/console/shp/aftersales/damage' },
          { label: tn('shopReplacements'),   href: '/console/shp/aftersales/replacements' },
        ]},
        { subgroup: tg('shopComplianceGrp'), items: [
          { label: tn('shopCompliance'),  href: '/console/shp/compliance/registrations' },
          { label: tn('shopHazards'),     href: '/console/shp/compliance/hazards' },
          { label: tn('shopGdpr'),        href: '/console/shp/compliance/gdpr' },
        ]},
      ]},
    { label: tn('shopSettings'),     href: '/console/shp/settings' },
  ]},

  { group: tg('masterData'), items: [
    { label: tn('businessPartners'), href: '/console/mdm/partners' },
    { label: tn('vehicleTaxonomy'),  href: '/console/mdm/taxonomy' },
    { label: tn('equipmentCatalog'), href: '/console/master-data/equipment',  v3: true },
  ]},

  { group: tg('tools'), items: [
    { label: tn('tasks'),             href: '/console/ops/tasks' },
    { label: tn('goals'),             href: '/console/ops/goals' },
    { label: tn('execDashboardOps'),  href: '/console/ops/goals/dashboard' },
    { label: tn('profitLab'),        href: '/console/ops/profit-lab' },
    { label: tn('qrTool'),           href: '/console/ops/qr' },
    { label: tn('flyerBuilder'),     href: '/console/ops/flyer' },
    { label: tn('imageRenamer'),     href: '/console/ops/image-renamer' },
    { label: tn('watermark'),         href: '/console/ops/watermark' },
    { label: tn('photoEnhance'),     href: '/console/ops/photo-enhance' },
  ]},

  { group: tg('system'), items: [
    { label: tg('users'), subitems: [
      { label: tn('userList'),         href: '/console/sys/users' },
      { label: tn('userCockpit'),      href: '/console/sys/user-cockpit' },
      { label: tn('sessionsAdm'),          href: '/console/sys/sessions' },
      { label: tn('accessAudit'),      href: '/console/sys/access-audit' },
      { label: tn('accessRequests'),    href: '/console/sys/access-request', v3: true },
      { label: tn('sodConflicts'),      href: '/console/sys/sod',            v3: true },
      { label: tn('recertification'),    href: '/console/sys/recertification',v3: true },
      { label: tn('bulkUsers'),         href: '/console/sys/bulk-users',     v3: true },
    ]},
    { label: tg('accessRoles'), subitems: [
      { label: tn('roleCatalog'),      href: '/console/sys/roles' },
      { label: tn('securityCockpit'),  href: '/console/sys/suim' },
      { label: tn('rbac'),              href: '/console/sys/rbac' },
      { label: tn('auditLog'),         href: '/console/sys/audit' },
    ]},
    { label: tg('configuration'), subitems: [
      { label: tn('systemSettings'),   href: '/console/sys/settings' },
      { label: tn('tenants'),           href: '/console/sys/tenants' },
      { label: tn('screenExplorer'),   href: '/console/sys/screen-explorer' },
      { label: tn('moduleManager'),   href: '/console/sys/modules' },
      { label: tn('menuConfig'),      href: '/console/sys/menu-config' },
      { label: tn('counters'),        href: '/console/sys/counters' },
    ]},
    { label: tg("development"), subitems: [
      { label: tn("devDashboard"),    href: "/console/dev" },
      { label: tn("enhancements"),    href: "/console/dev/enhancements" },
      { label: tn("productionQueue"), href: "/console/dev/queue" },
      { label: tn("commits"),         href: "/console/dev/commits" },
      { label: tn("releases"),        href: "/console/dev/releases" },
      { label: tn("deployments"),     href: "/console/dev/deployments" },
      { label: tn("definitionAudit"), href: "/console/dev/definition-audit" },
      { label: tn("implCockpit"),     href: "/console/sys/impl" },
    ]},
    { label: tg("dataAcquisition"), subitems: [
      { label: tn("listingsCockpit"),    href: "/console/dae/cockpit" },
      { label: tn("searchProfiles"),     href: "/console/dae/profiles" },
      { label: tn("sourceConfig"),       href: "/console/dae/sources" },
      { label: tn("runHistory"),         href: "/console/dae/runs" },
      { label: tn("priceIntelligence"),  href: "/console/dae/pricing" },
    ]},
    { label: tg("integration"), subitems: [
      { label: tn("connectorManager"), href: "/console/int/connectors" },
      { label: tn("integrationLog"),   href: "/console/int/log" },
      { label: tn("flowManager"),       href: "/console/int/flows" },
      { label: tn("messageQueue"),      href: "/console/int/queue" },
      { label: tn("fieldMappingStudio"), href: "/console/int/mappings" },
      { label: tn("lookupCodes"),         href: "/console/int/lookup" },
      { label: tn("publishJobs"),         href: "/console/int/publish" },
      { label: tn("webhookEvents"),       href: "/console/int/webhook-events" },
    ]},
    { label: tg("infrastructure"), subitems: [
      { label: tn('adminDashboard'),   href: '/console/sys/dashboard' },
      { label: tn('systemHealth'),     href: '/console/sys/health' },
      { label: tn('dbJobs'),           href: '/console/sys/jobs' },
      { label: tn('lockMonitor'),      href: '/console/sys/locks' },
      { label: tn('imapMonitor'),      href: '/console/sys/imap' },
      { label: tn('mcp'),               href: '/console/sys/mcp' },
      { label: tn('gdrive'),            href: '/console/sys/drive' },
      { label: tn('handoff'),           href: '/console/sys/handoff' },
    ]},
  ]},
  ];
}

// Sidebar shortcut sections are disabled — shortcuts now live in the "My Work" menu.
// Flip to true to restore the star-marked custom sections in the left sidebar.
const SHOW_SIDEBAR_SHORTCUTS = false;

const QUICK_CREATE = [
  { label: 'Listing',        action: 'link' },
  { label: 'Lead',           action: 'link' },
  { label: 'Customer',       action: 'link' },
  { label: 'Task',           action: 'link' },
  { label: 'Invoice',        action: 'link' },
  { label: 'Rental Booking', action: 'link' },
  { label: 'Support Request', action: 'support' },
];



// ─── Notification Bell ───────────────────────────────────────────────────────
type CustomSection = { id: string; label: string; items: { screen_id: string; title: string; route: string }[] };

function ShortcutMenuModal({ onClose, onSave }: { onClose: () => void; onSave: (s: CustomSection) => void }) {
  const [label, setLabel]     = useState('');
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [items, setItems]     = useState<{ screen_id: string; title: string; route: string }[]>([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch('/api/bop/sys/search?q=' + encodeURIComponent(query.trim()))
        .then(r => r.json()).then(d => setResults((d.results ?? []).slice(0, 8))).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(r: any) {
    if (items.some(i => i.screen_id === r.screen_id)) return;
    setItems(prev => [...prev, { screen_id: r.screen_id, title: r.title, route: r.route }]);
    setQuery(''); setResults([]);
  }
  function removeItem(sc: string) { setItems(prev => prev.filter(i => i.screen_id !== sc)); }
  function save() {
    if (!label.trim() || items.length === 0) return;
    onSave({ id: Date.now().toString(), label: label.trim(), items });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">New Shortcut Menu</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Section name</label>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. My Shortcuts"
          className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="mb-1 block text-xs font-semibold text-slate-600">Add screens (TC code or name)</label>
        <div className="relative mb-3">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search DV001, SY001..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((r: any) => (
                <button key={r.screen_id} onClick={() => addItem(r)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{r.screen_id}</span>
                  <span className="truncate text-sm text-slate-700">{r.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className="mb-4 space-y-1">
            {items.map(i => (
              <div key={i.screen_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700">{i.screen_id}</span>
                  <span className="text-sm text-slate-700">{i.title}</span>
                </div>
                <button onClick={() => removeItem(i.screen_id)} className="text-slate-300 hover:text-red-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={!label.trim() || items.length === 0}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Save</button>
        </div>
      </div>
    </div>
  );
}

function EditShortcutModal({ section, onClose, onSave }: { section: CustomSection; onClose: () => void; onSave: (s: CustomSection) => void }) {
  const [label, setLabel]     = useState(section.label);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [items, setItems]     = useState(section.items);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch('/api/bop/sys/search?q=' + encodeURIComponent(query.trim()))
        .then(r => r.json()).then(d => setResults((d.results ?? []).slice(0, 8))).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(r: any) {
    if (items.some(i => i.screen_id === r.screen_id)) return;
    setItems(prev => [...prev, { screen_id: r.screen_id, title: r.title, route: r.route }]);
    setQuery(''); setResults([]);
  }
  function removeItem(sc: string) { setItems(prev => prev.filter(i => i.screen_id !== sc)); }
  function moveUp(idx: number) { if (idx === 0) return; const a = [...items]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; setItems(a); }
  function moveDown(idx: number) { if (idx === items.length-1) return; const a=[...items]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; setItems(a); }
  function save() { if (!label.trim() || items.length === 0) return; onSave({ ...section, label: label.trim(), items }); onClose(); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Edit Shortcut Menu</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Section name</label>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="mb-1 block text-xs font-semibold text-slate-600">Screens</label>
        <div className="mb-3 max-h-44 space-y-1 overflow-y-auto">
          {items.map((i, idx) => (
            <div key={i.screen_id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(idx)} disabled={idx===0} className="text-slate-300 hover:text-slate-600 disabled:opacity-20">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx===items.length-1} className="text-slate-300 hover:text-slate-600 disabled:opacity-20">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700">{i.screen_id}</span>
              <span className="flex-1 truncate text-sm text-slate-700">{i.title}</span>
              <button onClick={() => removeItem(i.screen_id)} className="text-slate-300 hover:text-red-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="py-3 text-center text-xs text-slate-400">No screens</p>}
        </div>
        <div className="relative mb-4">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Add screen: DV001, SY001..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((r: any) => (
                <button key={r.screen_id} onClick={() => addItem(r)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{r.screen_id}</span>
                  <span className="truncate text-sm text-slate-700">{r.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={!label.trim() || items.length === 0}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

type Notif = { id: string; type: string; title: string; body: string; is_read: boolean; created_at: string; meta?: Record<string,string> };

function NotificationBell({ tenantId }: { tenantId: number }) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [unread, setUnread]   = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch(`/api/bop/notifications?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(j => { setNotifs(j.notifications ?? []); setUnread(j.unread_count ?? 0); })
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function markRead(id?: string) {
    void fetch('/api/bop/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : { tenant_id: tenantId }),
    }).then(() => load());
  }

  const TYPE_ICON: Record<string, string> = { warning: '⚠', error: '✕', info: 'ℹ', success: '✓' };
  const TYPE_COLOR: Record<string, string> = {
    warning: 'text-amber-500 bg-amber-50',
    error:   'text-red-500 bg-red-50',
    info:    'text-blue-500 bg-blue-50',
    success: 'text-emerald-500 bg-emerald-50',
  };

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h >= 24) return `${Math.floor(h/24)}d ago`;
    if (h >= 1)  return `${h}h ago`;
    return `${Math.max(1, m)}m ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`relative rounded-lg p-1.5 transition-colors ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
        title="Notifications">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={() => markRead()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto" style={{scrollbarWidth:"none",msOverflowStyle:"none"}}>
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg className="mb-2 h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                <p className="text-sm">No notifications</p>
              </div>
            ) : notifs.map(n => (
              <div key={n.id}
                className={`flex gap-3 border-b border-slate-50 px-4 py-3.5 transition-colors hover:bg-slate-50/80 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                {/* Type icon */}
                <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${TYPE_COLOR[n.type] ?? 'text-slate-500 bg-slate-100'}`}>
                  {TYPE_ICON[n.type] ?? '·'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-snug ${!n.is_read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-snug line-clamp-3">{n.body}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {n.meta?.source && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">{n.meta.source}</span>
                    )}
                    <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} title="Mark read"
                    className="mt-1 flex-shrink-0 text-slate-300 hover:text-blue-500 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
            <p className="text-[10px] text-slate-400">
              {notifs.length} notifications · auto-refresh every 30s · source: vps-monitor
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Last Updated ────────────────────────────────────────────────────────────
function TenantDropdown() {
  const { unit, setUnit, units } = useScope();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(o => !o)}
        className={`group flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
          open
            ? 'border-blue-300 bg-blue-50 shadow-sm shadow-blue-100'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
        }`}>
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: unit.color }} />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: unit.color }} />
        </span>
        <span className="font-semibold text-slate-800">{unit.label}</span>
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 group-hover:bg-slate-200 transition-colors">
          {unit.id}
        </span>
        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-black/5">
          {/* Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Switch Tenant</p>
            <p className="mt-0.5 text-xs text-slate-500">Active: <span className="font-semibold text-slate-700">{unit.label}</span></p>
          </div>

          {/* List */}
          <div className="py-1.5">
            {units.map((u, _i) => {
              const selected = u.id === unit.id;
              return (
                <button key={u.id} onClick={() => { setUnit(u); setOpen(false); }}
                  className={`group relative flex w-full items-center gap-3.5 px-4 py-3 text-left transition-all duration-100 ${
                    selected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}>
                  {/* Color dot with glow */}
                  <div className="relative flex-shrink-0">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${u.color}40, ${u.color}22)`, color: u.color }}>
                      {u.label?.slice(0,1).toUpperCase()}
                    </div>
                    {selected && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white">
                        <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold leading-tight ${selected ? 'text-blue-700' : 'text-slate-800'}`}>{u.label}</p>
                      <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {u.code}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">{u.domain} · ID {u.id}</p>
                  </div>

                  <svg className={`h-4 w-4 flex-shrink-0 transition-opacity ${selected ? 'text-blue-500 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
            <p className="text-[10px] text-slate-400">{units.length} tenants available</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Chevron icon
function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-3 w-3 flex-shrink-0 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

// Single nav leaf link
function NavLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
  // For /console/mkt/studio: only active on exact match or session pages, not on named sub-pages
  const STUDIO_NAMED_SUBS = ['/console/mkt/studio/preset-backgrounds', '/console/mkt/studio/new'];
  const isStudioParent = item.href === '/console/mkt/studio';
  const onNamedSub = STUDIO_NAMED_SUBS.some(sub => pathname.startsWith(sub));
  const active = pathname === item.href
    || (!isStudioParent && pathname.startsWith(item.href + '/'))
    || (isStudioParent && pathname.startsWith(item.href + '/') && !onNamedSub);
  const reg = SCREEN_REGISTRY[item.href];
  if (item.disabled || item.v3) {
    return (
      <span className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm cursor-not-allowed opacity-40 select-none">
        <span>{item.label}</span>
        <span className="ml-auto rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-[8px] font-bold text-slate-400 dark:text-slate-500">V3</span>
      </span>
    );
  }
  return (
    <Link href={item.href}
      className={`flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
      }`}>
      {navIcon(item.href)}
      <span className="flex-1 truncate">{item.label}</span>
      {reg && <span className={active ? 'ml-auto font-mono text-[9px] text-indigo-400 dark:text-indigo-500' : 'ml-auto font-mono text-[9px] text-slate-300 dark:text-slate-600'}>{reg.id}</span>}
    </Link>
  );
}

// Admin expandable submenu (e.g. Users → SY001, SY015, SY016, SY017)
function AdminSubMenu({ item, pathname }: { item: { label: string; subitems: NavLeaf[] }; pathname: string }) {
  const anyActive = item.subitems.some(i => pathname.startsWith(i.href));
  const [open, setOpen] = useState(anyActive);
  useEffect(() => { if (anyActive) setOpen(true); }, [anyActive]);
  return (
    <li>
      <button onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-[7px] px-2.5 py-2 text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200">
        <span>{item.label}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 dark:border-slate-700/40 pl-2">
          {item.subitems.map(leaf => {
            const active = pathname === leaf.href || pathname.startsWith(leaf.href);
            const leafReg = SCREEN_REGISTRY[leaf.href];
            return (
              <li key={leaf.href}>
                <Link href={leaf.href}
                  className={`flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>
                  {navIcon(leaf.href)}<span className="flex-1 truncate">{leaf.label}</span>
                  {leafReg && <span className="ml-auto font-mono text-[9px] text-slate-300 dark:text-slate-600">{leafReg.id}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// Analytics expandable item with subgroups
function AnalyticsNav({ item, pathname }: { item: { label: string; href: string; subgroups: NavSubGroup[] }; pathname: string }) {
  const anyChildActive = item.subgroups.some(sg => sg.items.some(i => pathname.startsWith(i.href)));
  const isParentActive = pathname === item.href;
  const [open, setOpen] = useState(anyChildActive);
  useEffect(() => { if (anyChildActive) setOpen(true); }, [anyChildActive]);
  const [openSg, setOpenSg] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    item.subgroups.forEach(sg => {
      init[sg.subgroup] = sg.items.some(i => pathname.startsWith(i.href));
    });
    return init;
  });

  useEffect(() => {
    item.subgroups.forEach(sg => {
      if (sg.items.some(i => pathname.startsWith(i.href))) {
        setOpenSg(prev => (prev[sg.subgroup] ? prev : { ...prev, [sg.subgroup]: true }));
      }
    });
  }, [pathname, item.subgroups]);

  function toggleSg(name: string) {
    setOpenSg(prev => ({ ...prev, [name]: !prev[name] }));
  }

  const reg = SCREEN_REGISTRY[item.href];

  return (
    <li>
      {/* Analytics parent row — full row toggles open/close */}
      <button onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between rounded-[7px] px-2.5 py-2 text-[13px] font-medium transition-colors ${
          isParentActive
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
        }`}>
        <span>{item.label}</span>
        <div className="flex items-center gap-1.5">
          {reg && <span className="font-mono text-[9px] opacity-50">{reg.id}</span>}
          <Chevron open={open} />
        </div>
      </button>

      {/* Subgroups */}
      {open && (
        <div className="ml-3 mt-0.5 border-l border-slate-200 dark:border-slate-700/40 pl-2">
          {item.subgroups.map(sg => (
            <div key={sg.subgroup} className="mb-0.5">
              {/* Subgroup header */}
              <button onClick={() => toggleSg(sg.subgroup)}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">{sg.subgroup}</span>
                <Chevron open={!!openSg[sg.subgroup]} />
              </button>
              {/* Subgroup items */}
              {openSg[sg.subgroup] && (
                <ul className="mt-0.5 space-y-0.5">
                  {sg.items.map(leaf => {
                    const active = pathname === leaf.href;
                    const leafReg = SCREEN_REGISTRY[leaf.href];
                    return (
                      <li key={leaf.href}>
                        <Link href={leaf.href}
                          className={`flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}>
                          <span>{leaf.label}</span>
                          {leafReg && <span className="ml-auto font-mono text-[9px] opacity-50">{leafReg.id}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}


// ─── TC Search / Command Palette ────────────────────────────────────────────
const HISTORY_KEY = 'bop_tcsearch_history';
const HISTORY_MAX = 10;

type HistoryItem = { tc?: string; label: string; route: string; group: string; at: number };

function getHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
function saveHistory(item: Omit<HistoryItem,'at'>) {
  const prev = getHistory().filter(h => h.route !== item.route);
  const next: HistoryItem[] = [{ ...item, at: Date.now() }, ...prev].slice(0, HISTORY_MAX);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
}
function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

function ResultRow({ item, i, focused, onNav }: { item: any; i: number; focused: number; onNav: () => void }) {
  return (
    <button onMouseDown={onNav}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === focused ? "bg-slate-100" : "hover:bg-slate-50"}`}>
      {item.tc ? (
        <span className="w-14 flex-shrink-0 rounded-md bg-blue-600 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-white">{item.tc}</span>
      ) : (
        <span className="w-14 flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-slate-400">&#8212;</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{item.label}</p>
        <p className="truncate text-[10px] text-slate-400">{item.group}</p>
      </div>
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
    </button>
  );
}

function useTCSearchHotkeys(
  inputRef: React.RefObject<HTMLInputElement>,
  setOpen: (v: boolean) => void,
  setQuery: (v: string) => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputRef, setOpen, setQuery]);
}

function TCSearch() {
  const tn = useTranslations('nav');
  const tg = useTranslations('groups');
  const dbNav = useNav(); const NAV = dbNav.length > 0 ? dbNav : makeNav(tn, tg);
  const router = useRouter();
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [focused, setFocused]     = useState(0);
  const [history, setHistory]     = useState<HistoryItem[]>([]);
  const [histEnabled, setHistEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load current user + their tcsearch_history_enabled pref
  useEffect(() => {
    void supabase?.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id ?? null;
      if (!uid) return;
      fetch(`/api/bop/user/prefs?user_id=${uid}&key=tcsearch_history_enabled`)
        .then(r => r.json())
        .then(j => {
          const enabled = j.value === 'true';
          setHistEnabled(enabled);
          if (enabled) setHistory(getHistory());
        })
        .catch(() => {});
    });
  }, []);

  // Build flat search index from NAV + SCREEN_REGISTRY
  const index = useMemo(() => {
    const items: { id: string; label: string; route: string; group: string; tc?: string }[] = [];
    function addLeaf(leaf: NavLeaf, group: string) {
      if (leaf.disabled || leaf.v3) return;
      const reg = SCREEN_REGISTRY[leaf.href];
      items.push({ id: leaf.href, label: leaf.label, route: leaf.href, group, tc: reg?.id });
    }
    NAV.forEach(section => {
      section.items.forEach((item: any) => {
        if ('subitems' in item) {
          item.subitems.forEach((sub: any) => addLeaf(sub, section.group));
        } else if ('subgroups' in item) {
          item.subgroups.forEach((sg: any) => sg.items.forEach((leaf: any) => addLeaf(leaf, sg.subgroup)));
        } else {
          addLeaf(item, section.group);
        }
      });
    });
    return items;
  }, [NAV]);

  const [metaResults, setMetaResults] = useState<any[]>([]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return index.filter(item =>
      item.tc?.toLowerCase().startsWith(q) ||
      item.label.toLowerCase().includes(q) ||
      item.route.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, index]);

  // Extended search — DB tables + API routes via meta
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setMetaResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/bop/sys/search?q=${encodeURIComponent(query.trim())}`)
        .then(r => r.json())
        .then(j => {
          // Only show meta-match results not already in NAV index
          const navRoutes = new Set(index.map(i => i.route));
          setMetaResults((j.results ?? []).filter((r: any) => !navRoutes.has(r.route)).slice(0, 4));
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [query, index]);

  useEffect(() => { setFocused(0); }, [results]);

  useTCSearchHotkeys(inputRef as React.RefObject<HTMLInputElement>, setOpen, setQuery);

  function navigate(item: { route: string; label: string; group: string; tc?: string }) {
    if (histEnabled) {
      saveHistory({ route: item.route, label: item.label, group: item.group, tc: item.tc });
      setHistory(getHistory());
    }
    // Parametrized screens (e.g. /listings/[id]) cannot be opened without a record — land on the parent list instead.
    router.push(item.route.includes("/[") ? item.route.split("/[")[0] : item.route);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f+1, results.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f-1, 0)); }
    if (e.key === 'Enter' && results[focused]) navigate(results[focused]);
  }

  const showHistory   = open && !query.trim() && histEnabled && history.length > 0;
  const showResults   = open && (results.length > 0 || metaResults.length > 0);
  const showEmpty     = open && query.trim() && results.length === 0 && metaResults.length === 0;



  return (
    <div className="relative ml-4 hidden w-72 md:ml-6 md:block">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={onKeyDown}
          placeholder="Search by TC code or description…  ⌘K" autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:shadow-sm transition-all"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* ── Recent History Panel ───────────────────────────────── */}
      {showHistory && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recently Visited</p>
            </div>
            <button onMouseDown={() => { clearHistory(); setHistory([]); }}
              className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">Clear all</button>
          </div>
          <div>
            {history.slice(0, 10).map((item, _i) => (
              <button key={item.route} onMouseDown={() => navigate(item)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors group">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                {item.tc ? (
                  <span className="w-14 flex-shrink-0 rounded-md bg-slate-700 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-white">{item.tc}</span>
                ) : (
                  <span className="w-14 flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-slate-400">—</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.group}</p>
                </div>
                <span className="text-[10px] text-slate-300 flex-shrink-0">
                  {Math.round((Date.now() - item.at) / 60000) < 60
                    ? `${Math.max(1, Math.round((Date.now() - item.at) / 60000))}m ago`
                    : `${Math.round((Date.now() - item.at) / 3600000)}h ago`}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2">
            <p className="text-[10px] text-slate-400">History stored in browser · enable via your Profile → Preferences → Search History</p>
          </div>
        </div>
      )}

      {/* ── Search Results Panel ───────────────────────────────── */}
      {showResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-black/5">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
          </div>
          {results.map((item, i) => (
            <ResultRow key={item.id} item={item} i={i} focused={focused} onNav={() => navigate(item)} />
          ))}
          {metaResults.length > 0 && (
            <>
              <div className="border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Registry matches — DB tables / API routes</p>
              </div>
              {metaResults.map((r: any) => (
                <button key={r.screen_id} onMouseDown={() => navigate({ route: r.route, label: r.title, group: r.module, tc: r.screen_id })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
                  <span className="w-14 flex-shrink-0 rounded-md bg-purple-600 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-white">{r.screen_id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                    {r.match_value && <p className="truncate text-[10px] font-mono text-slate-400">{r.match_type === 'api_route' ? '⚡' : '🗄'} {r.match_value}</p>}
                  </div>
                  <span className="text-[9px] text-slate-300 flex-shrink-0">{r.match_type}</span>
                </button>
              ))}
            </>
          )}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-1.5 text-[10px] text-slate-300">
            ↑↓ navigate · Enter to open · Esc to close
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {showEmpty && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
          <div className="px-4 py-5 text-center">
            <p className="text-sm font-medium text-slate-500">No screen found for <span className="font-mono font-semibold text-slate-700">"{query}"</span></p>
            <p className="mt-1 text-xs text-slate-400">Try a TC code (e.g. FI001) or screen name</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const tn = useTranslations('nav');
  const tg = useTranslations('groups');
  const dbNav = useNav(); const NAV = dbNav.length > 0 ? dbNav : makeNav(tn, tg);
  const { env, user, role, unit } = useScope();
  const [quickOpen, setQuickOpen]   = useState(false);
  const [aiOpen, setAiOpen]         = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [openSupCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langSaving, setLangSaving]   = useState(false);
  const [density, setDensity]       = useState<'comfortable'|'compact'|'condensed'>('comfortable');
  const [, setTheme]                 = useState<'light'|'dark'>('light');
  const [uiScale, setUiScaleState]           = useState<'sm'|'md'|'lg'|'xl'>('md');
  const [fontFamily, setFontFamilyState]     = useState<string>('system');
  const [highContrast, setHighContrastState] = useState(false);
  const [themeStyle, setThemeStyleState]      = useState<string>('flat');
  const [navIcons, setNavIconsState]          = useState(true);
  const [pinnedScreens, setPinned]  = useState<{tc:string;label:string;route:string}[]>([]);
  const [customSections, setCustomSections]   = useState<CustomSection[]>([]);
  const [showShortcutModal, setShortcutModal] = useState(false);
  const [editingSection, setEditingSection]   = useState<CustomSection | null>(null);
  const [authUserId, setAuthUserId]           = useState<string | null>(null);

  // Load density + pinned + custom sections from user prefs (UUID-based)
  useEffect(() => {
    void supabase?.auth.getUser().then(({ data: authData }) => {
      const uid = authData?.user?.id ?? null;
      if (!uid) return;
      setAuthUserId(uid);
      supabase!.from('bop_user_prefs')
        .select('key,value')
        .eq('user_id', uid)
        .in('key', ['pinned_screens','custom_nav_sections','mywork_seeded'])
        .then(({ data }) => {
          if (!data) return;
          const p  = data.find(r => r.key === 'pinned_screens');
          const cs = data.find(r => r.key === 'custom_nav_sections');
          const seeded = data.find(r => r.key === 'mywork_seeded');
          let pins: {tc:string;label:string;route:string}[] = [];
          if (p?.value)  { try { pins = JSON.parse(p.value); setPinned(pins); } catch {} }
          if (cs?.value) { try { setCustomSections(JSON.parse(cs.value)); } catch {} }
          // First login: auto-seed the dealer template once for dealer-perspective roles.
          if (!seeded) {
            const put = (key: string, value: string) => fetch('/api/bop/user/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid, key, value }) });
            if (DEALER_ROLES.includes(role) && pins.length === 0) {
              setPinned(DEALER_TEMPLATE);
              void put('pinned_screens', JSON.stringify(DEALER_TEMPLATE));
            }
            void put('mywork_seeded', '1');
          }
        });
    });
  }, [role]);

  function savePref(key: string, value: string) {
    const uid = authUserId;
    if (!uid) return;
    void fetch('/api/bop/user/prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, key, value }),
    });
  }

  // Tenant-scoped appearance: save to (user, tenant, key)
  function savePrefT(key: string, value: string) {
    if (!authUserId || !supabase) return;
    supabase.from('bop_user_appearance')
      .upsert({ user_id: authUserId, tenant_id: unit.id, key, value }, { onConflict: 'user_id,tenant_id,key' })
      .then(() => {});
  }

  // Load + apply appearance for the current (user, tenant); re-apply on tenant switch
  useEffect(() => {
    if (!authUserId || !supabase) return;
    // reset to defaults so a tenant's look never bleeds into another
    setTheme('light'); document.documentElement.classList.remove('dark');
    setDensity('comfortable');
    setUiScaleState('md'); applyScale('md');
    setFontFamilyState('system'); applyFont('system');
    setHighContrastState(false); applyContrast(false);
    setThemeStyleState('flat'); applyThemeStyle('flat');
    setNavIconsState(true); document.documentElement.classList.remove('bop-noicons');
    supabase.from('bop_user_appearance')
      .select('key,value')
      .eq('user_id', authUserId)
      .eq('tenant_id', unit.id)
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const r of data ?? []) if (r.value !== null) m[r.key] = r.value;
        if (m.theme === 'dark') { setTheme('dark'); document.documentElement.classList.add('dark'); }
        if (m.density) setDensity(m.density as any);
        if (m.ui_scale) { setUiScaleState(m.ui_scale as any); applyScale(m.ui_scale); }
        if (m.font_family) { setFontFamilyState(m.font_family); applyFont(m.font_family); }
        if (m.high_contrast === 'on') { setHighContrastState(true); applyContrast(true); }
        if (m.theme_style) { setThemeStyleState(m.theme_style); applyThemeStyle(m.theme_style); }
        if (m.nav_icons === 'off') { setNavIconsState(false); document.documentElement.classList.add('bop-noicons'); }
        if (m.nav_mode) { setNavModeState(m.nav_mode as any); applyNavMode(m.nav_mode as any); }
      });
  }, [authUserId, unit.id]);

  function saveCustomSections(sections: CustomSection[]) {
    setCustomSections(sections);
    savePref('custom_nav_sections', JSON.stringify(sections));
  }
  function deleteCustomSection(id: string) {
    saveCustomSections(customSections.filter(s => s.id !== id));
  }
  function updateCustomSection(s: CustomSection) {
    saveCustomSections(customSections.map(c => c.id === s.id ? s : c));
  }

  function setDensityPref(v: 'comfortable'|'compact'|'condensed') { setDensity(v); savePrefT('density', v); }

  function applyScale(v: string) { const el = document.documentElement; el.classList.remove('bop-scale-sm','bop-scale-md','bop-scale-lg','bop-scale-xl'); el.classList.add('bop-scale-' + v); }
  function applyFont(v: string) { const el = document.documentElement; el.className = el.className.split(' ').filter(c => !c.startsWith('bop-font-')).join(' '); el.classList.add('bop-font-' + v); }
  function applyContrast(on: boolean) { document.documentElement.classList.toggle('bop-contrast', on); }
  function applyThemeStyle(v: string) { const el = document.documentElement; el.className = el.className.split(' ').filter(c => !c.startsWith('theme-')).join(' '); if (v !== 'flat') el.classList.add('theme-' + v); }
  function setThemeStyle(v: string) { setThemeStyleState(v); applyThemeStyle(v); savePrefT('theme_style', v); }
  function applyNavIcons(on: boolean) { document.documentElement.classList.toggle('bop-noicons', !on); }
  function setNavIcons(on: boolean) { setNavIconsState(on); applyNavIcons(on); savePrefT('nav_icons', on ? 'on' : 'off'); }
  function setUiScale(v: 'sm'|'md'|'lg'|'xl') { setUiScaleState(v); applyScale(v); savePrefT('ui_scale', v); }
  function setFontFamily(v: string) { setFontFamilyState(v); applyFont(v); savePrefT('font_family', v); }
  function toggleContrast() { const n = !highContrast; setHighContrastState(n); applyContrast(n); savePrefT('high_contrast', n ? 'on' : 'off'); }
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [navPosition, setNavPositionState] = useState<'left'|'right'>('left');
  const [navMode, setNavModeState] = useState<'accordion'|'flyout'|'top'>('accordion');
  const [flyoutGroup, setFlyoutGroup] = useState<string|null>(null);
  const settingsPanel = (
    <>
                  {/* Language setting */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Interface Language</p>
                    <div className="flex gap-1">
                      {([
                        { code: 'nl', label: 'NL', name: 'Nederlands' },
                        { code: 'en', label: 'EN', name: 'English' },
                        { code: 'de', label: 'DE', name: 'Deutsch' },
                        { code: 'tr', label: 'TR', name: 'Türkçe' },
                        { code: 'fr', label: 'FR', name: 'Français' },
                      ] as const).map(({ code, label, name }) => {
                        const cookieLang = document?.cookie?.match(/bop_locale=([a-z]+)/)?.[1] ?? 'nl';
                        const isCurrent = cookieLang === code;
                        return (
                          <button
                            key={code}
                            disabled={langSaving}
                            title={name}
                            onClick={() => { void (async () => {
                              setLangSaving(true);
                              try {
                                const res = await fetch('/api/bop/user/locale', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ language: code, email: user.email }),
                                });
                                if (res.ok) {
                                  document.cookie = 'bop_locale=' + code + ';path=/;max-age=31536000;samesite=lax';
                                }
                              } catch {}
                              setLangSaving(false);
                              setProfileOpen(false);
                              window.location.reload();
                            })(); }}
                            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Display & Accessibility */}
                  <div className="px-4 py-3 border-b border-slate-100 space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Display &amp; Accessibility</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Style</span>
                      <div className="w-44">
                        <BopSelect value={themeStyle} onChange={v => setThemeStyle(v)} size="sm"
                          options={[
                            { value:'flat', label:'Flat (default)' },
                            { value:'glossy', label:'Glossy (Web 2.0)' },
                            { value:'corporate', label:'Corporate' },
                            { value:'soft', label:'Soft' },
                            { value:'polaris', label:'Polaris' },
                            { value:'midnight', label:'Midnight (dark)' },
                            { value:'carbon', label:'Carbon (dark)' },
                            { value:'slate', label:'Slate (dark)' },
                          ]} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Text size</span>
                      <div className="flex gap-1">
                        {(['sm','md','lg','xl'] as const).map(v => (
                          <button key={v} onClick={() => setUiScale(v)}
                            className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${uiScale === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Font</span>
                      <div className="w-44">
                        <BopSelect value={fontFamily} onChange={v => setFontFamily(v)} size="sm"
                          options={[
                            { value:'system', label:'System (default)' },
                            { value:'inter', label:'Inter' },
                            { value:'roboto', label:'Roboto' },
                            { value:'opensans', label:'Open Sans' },
                            { value:'lato', label:'Lato' },
                            { value:'verdana', label:'Verdana' },
                            { value:'serif', label:'Georgia (serif)' },
                            { value:'merriweather', label:'Merriweather' },
                            { value:'mono', label:'Monospace' },
                            { value:'jetbrains', label:'JetBrains Mono' },
                            { value:'dyslexic', label:'OpenDyslexic' },
                          ]} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Density</span>
                      <div className="flex gap-1">
                        {([['comfortable','Cozy'],['compact','Compact'],['condensed','Dense']] as const).map(([v,lab]) => (
                          <button key={v} onClick={() => setDensityPref(v)}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${density === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{lab}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">High contrast</span>
                      <button onClick={toggleContrast} className={`rounded-full px-2.5 py-1 text-xs font-medium ${highContrast ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{highContrast ? 'On' : 'Off'}</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Nav icons</span>
                      <button onClick={() => setNavIcons(!navIcons)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${navIcons ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{navIcons ? 'On' : 'Off'}</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Nav menu</span>
                      <button onClick={toggleSidebar} className={`rounded-full px-2.5 py-1 text-xs font-medium ${!sidebarHidden ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{!sidebarHidden ? 'Visible' : 'Hidden'}</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Nav position</span>
                      <div className="flex gap-1">
                        {(['left','right'] as const).map(p => (
                          <button key={p} onClick={() => setNavPosition(p)}
                            className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${navPosition === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Nav style</span>
                      <div className="flex gap-1">
                        {([['accordion','Accordion'],['flyout','Fly-out'],['top','Top Menu']] as const).map(([v,lab]) => (
                          <button key={v} onClick={() => setNavMode(v)}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${navMode === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{lab}</button>
                        ))}
                      </div>
                    </div>
                  </div>
    </>
  );



  function pinScreen(item: {tc:string;label:string;route:string}) {
    const already = pinnedScreens.some(p => p.route === item.route);
    const next = already
      ? pinnedScreens.filter(p => p.route !== item.route)
      : [item, ...pinnedScreens].slice(0, 12);
    commitPins(next);
  }
  const [myWorkOpen, setMyWorkOpen] = useState(false);
  const [dragPin, setDragPin] = useState<number | null>(null);
  function commitPins(next: {tc:string;label:string;route:string}[]) {
    setPinned(next);
    savePref('pinned_screens', JSON.stringify(next));
    try { window.dispatchEvent(new CustomEvent('bop:pins-changed', { detail: next })); } catch {}
  }
  useEffect(() => {
    function onPins(e: Event) { setPinned((e as CustomEvent).detail); }
    window.addEventListener('bop:pins-changed', onPins);
    return () => window.removeEventListener('bop:pins-changed', onPins);
  }, []);
  function loadDealerTemplate() {
    const merged = [...DEALER_TEMPLATE, ...pinnedScreens.filter(p => !DEALER_TEMPLATE.some(t => t.route === p.route))].slice(0, 12);
    commitPins(merged);
  }
  function reorderPins(from: number, to: number) {
    if (from === to) return;
    const next = [...pinnedScreens];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commitPins(next);
  }
  const pathname = usePathname();
  const curScreen = getScreen(pathname);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(NAV.map(s => [s.group, false])));
  const router = useRouter();

  // Auto-open the nav group owning the current route (e.g. TC-search jump → SY001)
  useEffect(() => {
    // On the bare dashboard landing, open nothing.
    if (pathname === '/console' || pathname === '/console/') return;
    // Open ONLY the single most-specific group for the current route.
    // (Prefix match alone would open OVERVIEW everywhere, since its /console
    //  dashboard link is a prefix of every console route.)
    let best = { len: -1, group: '' };
    for (const section of NAV) {
      for (const item of section.items as any[]) {
        const hrefs: string[] = [];
        if ('subitems' in item) item.subitems.forEach((s: any) => hrefs.push(s.href));
        else if ('subgroups' in item) item.subgroups.forEach((sg: any) => sg.items.forEach((l: any) => hrefs.push(l.href)));
        else if (item.href) hrefs.push(item.href);
        for (const h of hrefs) {
          if ((pathname === h || pathname.startsWith(h + '/')) && h.length > best.len) {
            best = { len: h.length, group: section.group };
          }
        }
      }
    }
    if (best.group) setOpenGroups(prev => (prev[best.group] ? prev : { ...prev, [best.group]: true }));
  }, [pathname, NAV]);

  async function logout() { await signOut(); router.replace('/login'); }
  function toggleGroup(group: string) { setOpenGroups(prev => ({ ...prev, [group]: !prev[group] })); }
  // full-sidebar hide (v4-style) — persisted so the menu stays hidden across reloads
  useEffect(() => { try { setSidebarHidden(localStorage.getItem('bop_sidebar_hidden') === 'true'); } catch {} }, []);
  useEffect(() => { try { const p = localStorage.getItem('bop_nav_position'); if (p === 'right') setNavPositionState('right'); } catch {} }, []);
  useEffect(() => { try { const m = localStorage.getItem('bop_nav_mode') as 'accordion'|'flyout'|'top'|null; if (m) { setNavModeState(m); applyNavMode(m); } } catch {} }, []);
  function setNavPosition(p: 'left'|'right') { setNavPositionState(p); try { localStorage.setItem('bop_nav_position', p); } catch {} }
  function applyNavMode(v: 'accordion'|'flyout'|'top') { document.documentElement.classList.toggle('bop-flyout-nav', v === 'flyout'); document.documentElement.classList.toggle('bop-topnav', v === 'top'); }
  function setNavMode(v: 'accordion'|'flyout'|'top') { setNavModeState(v); applyNavMode(v); savePrefT('nav_mode', v); try { localStorage.setItem('bop_nav_mode', v); } catch {} }
  function toggleSidebar() { setSidebarHidden(h => { const nv = !h; try { localStorage.setItem('bop_sidebar_hidden', String(nv)); } catch {} return nv; }); }

  return (
    <div className={`flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 ${density === 'compact' ? 'bop-compact' : density === 'condensed' ? 'bop-compact bop-condensed' : ''}`}>
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5">
        <div className="flex items-center gap-3">
          <Link href={`/console?tenant=${unit.id}`} className="flex items-center gap-1.5 text-lg font-bold tracking-wide text-slate-900 hover:opacity-80 transition-opacity">
            <span className={`rounded px-1.5 py-0.5 text-sm text-white ${env === "PROD" ? "bg-red-600" : "bg-des-orange"}`}>DES</span>
            <span className="text-xs font-semibold text-slate-400">BOP</span>
          </Link>
          <TenantDropdown />
          {unit && <NotificationBell tenantId={unit.id} />}
          <button onClick={() => setSupportOpen(o => !o)} title="Contact Support"
            className={`relative rounded-lg p-1.5 transition-colors ${supportOpen ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {openSupCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {openSupCount > 9 ? '9+' : openSupCount}
              </span>
            )}
          </button>
          <button onClick={() => setAiOpen(o => !o)} title="AI Copilot"
            className={`flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors ${aiOpen ? 'border-purple-300 bg-purple-100 text-purple-800' : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-400 dark:hover:bg-purple-900/50'}`}>
            AI
          </button>
          <div className="relative">
            <button onClick={() => setQuickOpen(o => !o)}
              className="whitespace-nowrap flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg><span className="hidden lg:inline">Quick Create</span></button>
            {quickOpen && (
              <div className="absolute left-0 z-30 mt-1 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                {QUICK_CREATE.map((q) => (
                  <div key={q.label}>
                    {q.action === 'support' && <div className="my-1 border-t border-slate-100 dark:border-slate-800" />}
                    {q.action === 'menu'
                      ? <button onClick={() => { setQuickOpen(false); setShortcutModal(true); }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{q.label}</button>
                      : q.action === 'support'
                        ? <button onClick={() => { setQuickOpen(false); setSupportOpen(true); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            {q.label}
                          </button>
                        : <button onClick={() => setQuickOpen(false)}
                            className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{q.label}</button>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* My Work — personal workspace: favorites/shortcuts (ServiceNow-style) */}
          <div className="relative">
            <button type="button" onClick={() => setMyWorkOpen(o => !o)} title="My Work — favorites & shortcuts"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 border-l-4 border-l-teal-500 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" />
              </svg>
              <span className="hidden lg:inline">My Work</span>
            </button>
            {myWorkOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMyWorkOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><span className="h-3.5 w-1 rounded bg-teal-500" /> My Work</span>
                    {curScreen && (
                      <button onClick={() => pinScreen({ tc: curScreen.id, label: curScreen.title, route: pathname })}
                        disabled={pinnedScreens.some(p => p.route === pathname)}
                        className="flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-40">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        {pinnedScreens.some(p => p.route === pathname) ? 'Pinned' : 'Pin this screen'}
                      </button>
                    )}
                  </div>
                  <div className="px-2 py-2">
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Favorites</p>
                    {pinnedScreens.length === 0 ? (
                      <div className="px-2 py-3 text-center">
                        <p className="mb-2 text-[12px] text-slate-400">No favorites yet.</p>
                        <button onClick={loadDealerTemplate} className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100">Load dealer starter set</button>
                      </div>
                    ) : (
                      <ul className="space-y-0.5">
                        {pinnedScreens.map((pin, pi) => (
                          <li key={pin.route}
                            draggable
                            onDragStart={() => setDragPin(pi)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => { if (dragPin !== null) reorderPins(dragPin, pi); setDragPin(null); }}
                            onDragEnd={() => setDragPin(null)}
                            className={`group flex items-center rounded-md ${dragPin === pi ? 'opacity-40' : ''}`}>
                            <span className="cursor-grab px-0.5 text-slate-300 group-hover:text-slate-400" title="Drag to reorder">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>
                            </span>
                            <button onClick={() => { setMyWorkOpen(false); router.push(pin.route); }}
                              className="flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50">
                              <span className="truncate">{pin.label}</span><span className="ml-2 font-mono text-[9px] text-slate-300">{pin.tc}</span>
                            </button>
                            <button onClick={() => pinScreen({ tc: pin.tc, label: pin.label, route: pin.route })} title="Unpin"
                              className="ml-0.5 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {customSections.length > 0 && (
                    <div className="border-t border-slate-100 px-2 py-2">
                      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Shortcut Groups</p>
                      {customSections.map(cs => (
                        <div key={cs.id} className="mb-1.5">
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[11px] font-semibold text-slate-500">{cs.label}</span>
                            <button onClick={() => { setMyWorkOpen(false); setEditingSection(cs); }} className="text-[10px] text-teal-600 hover:underline">edit</button>
                          </div>
                          <ul>
                            {cs.items.map(it => (
                              <li key={it.route}>
                                <button onClick={() => { setMyWorkOpen(false); router.push(it.route); }}
                                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[12.5px] text-slate-600 hover:bg-slate-50">
                                  <span className="truncate">{it.title}</span><span className="ml-2 font-mono text-[9px] text-slate-300">{it.screen_id}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-0.5 border-t border-slate-100 px-2 py-2">
                    <button onClick={() => { setMyWorkOpen(false); setShortcutModal(true); }}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-teal-700 hover:bg-teal-50">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                      New shortcut group…
                    </button>
                    <a href="/console/my-work" onClick={() => setMyWorkOpen(false)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-slate-500 hover:bg-slate-50">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7-7 7M21 12H3"/></svg>
                      Open full workspace
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
        <TCSearch />
        <div className="flex items-center gap-3">
          <SystemMenu settingsPanel={settingsPanel} />
          {/* env (prod/dev) on top, screen TC code below — stacked, far right before user menu */}
          <div className="flex flex-col items-end gap-0.5 leading-none">
            <span className={env === 'PROD'
              ? 'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold border-amber-200 bg-amber-50 text-amber-700'}>
              <span className={`h-1.5 w-1.5 rounded-full ${env === 'PROD' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {env}
            </span>
            <ScreenBadge />
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{user.initials}</div>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold leading-none">{user.name}</p>
                <span className="text-[11px] font-medium text-amber-700">{role.replace('_', ' ')}</span>
              </div>
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/60">
                  {/* Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{user.initials}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                      <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{role.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="px-4 py-3 flex items-center justify-between dark:border-t dark:border-slate-800">
                    <a href="/console/sys/user-cockpit" onClick={() => setProfileOpen(false)}
                      className="text-xs font-medium text-blue-600 hover:underline">
                      My Profile
                    </a>
                    <button onClick={() => { setProfileOpen(false); void logout(); }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <AICopilot open={aiOpen} onClose={() => setAiOpen(false)} />
        <SupportDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
      </header>
      {navMode === 'top' && (
        <TopNavBar NAV={NAV} pathname={pathname} navIcons={navIcons} />
      )}
      <div className={`flex flex-1 overflow-hidden ${navPosition === 'right' ? 'flex-row-reverse' : ''}`}>
        {showShortcutModal && (
          <ShortcutMenuModal onClose={() => setShortcutModal(false)}
            onSave={s => saveCustomSections([...customSections, s])} />
        )}
        {editingSection && (
          <EditShortcutModal section={editingSection} onClose={() => setEditingSection(null)}
            onSave={s => { updateCustomSection(s); setEditingSection(null); }} />
        )}
        {/* floating reopen tab shown when the sidebar is fully hidden */}
          {sidebarHidden && navMode !== "top" && (
            <button onClick={toggleSidebar} title="Show menu"
              className="fixed left-0 top-24 z-40 flex items-center rounded-r-lg border border-l-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-3 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {!sidebarHidden && navMode !== 'top' && navMode === 'flyout' && (
            <FlyoutSidebar
              NAV={NAV}
              pathname={pathname}
              navIcons={navIcons}
              flyoutGroup={flyoutGroup}
              setFlyoutGroup={setFlyoutGroup}
              onHide={toggleSidebar}
              navPosition={navPosition}
            />
          )}
          {!sidebarHidden && navMode !== 'top' && navMode === 'accordion' && (
          <aside className="bop-sidebar w-60 flex-shrink-0 overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/50 px-3 py-4 text-slate-700 dark:text-slate-300">
            {SHOW_SIDEBAR_SHORTCUTS && customSections.map(cs_sec => (
              <div key={cs_sec.id} className="mb-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 pb-1">
                <div className="mb-1 flex items-center justify-between px-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{cs_sec.label}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setEditingSection(cs_sec)} title="Edit"
                      className="rounded p-0.5 text-slate-300 hover:bg-slate-200 hover:text-blue-500">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onClick={() => deleteCustomSection(cs_sec.id)} title="Delete"
                      className="rounded p-0.5 text-slate-300 hover:bg-slate-200 hover:text-red-500">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <ul className="space-y-0.5 px-1">
                  {cs_sec.items.map(item => (
                    <li key={item.route}>
                      <a href={item.route} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                        pathname === item.route || pathname.startsWith(item.route + "/")
                          ? "bg-white font-semibold text-des-blue shadow-sm"
                          : "text-slate-600 hover:bg-white/60 hover:text-slate-800"}`}>
                        <span className="truncate">{item.title}</span>
                        <span className="ml-1 shrink-0 rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[9px] text-slate-400">{item.screen_id}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {NAV.map(section => {
              const isOpen = openGroups[section.group] === true;
              return (
                <div key={section.group} className={`mb-1 rounded-lg transition-colors ${isOpen ? "bg-slate-100 dark:bg-slate-800/50 pb-1" : ""}`}>
                  <button
                    onClick={() => toggleGroup(section.group)}
                    className="mb-1 flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">{section.group}</p>
                    <Chevron open={isOpen} />
                  </button>
                  {isOpen && (
                    <ul className="space-y-0.5">
                      {section.items.map((item: NavItem) => {
                        if ("subgroups" in item) {
                          return <AnalyticsNav key={item.href} item={item} pathname={pathname} />;
                        }
                        if ("subitems" in item) {
                          return <AdminSubMenu key={item.label} item={item} pathname={pathname} />;
                        }
                        return <NavLink key={item.href} item={item} pathname={pathname} />;
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
        {/* hide-menu handle — bottom of the sidebar */}
            <div className="mt-2 flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-2">
              <button onClick={toggleSidebar} title="Hide menu"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /></svg>
              </button>
            </div>
          </aside>
          )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}