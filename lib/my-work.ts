// Shared My Work (favorites / personal workspace) constants.
export type Pin = { tc: string; label: string; route: string };

// Dealer starter template — sensible default favorites, auto-seeded on a
// dealer's first login and offered as a one-click "load" elsewhere.
export const DEALER_TEMPLATE: Pin[] = [
  { tc: 'MP001', label: 'Listing Manager',     route: '/console/mkp/listings' },
  { tc: 'CR001', label: 'Leads',               route: '/console/crm/leads' },
  { tc: 'CR006', label: 'Pipeline Kanban',     route: '/console/crm/kanban' },
  { tc: 'SA013', label: 'Sell Leads',          route: '/console/sal/sell-leads' },
  { tc: 'SA008', label: 'Rentals',             route: '/console/sal/rentals' },
  { tc: 'AN005', label: 'Listing Performance', route: '/console/an/listing-perf' },
];

// Roles that represent the dealer / end-user perspective (non platform-admin),
// which get the template auto-seeded once on first login.
export const DEALER_ROLES = ['tenant_manager', 'viewer'];
