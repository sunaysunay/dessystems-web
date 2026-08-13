// Shared module code → human name map (canonical; extend when new modules land)
export const MODULE_NAMES: Record<string, string> = {
  AIM: 'AI Management',
  ANL: 'Analytics',
  AST: 'Asset / Inventory',
  AUC: 'Auction',
  BOP: 'Back-Office Platform',
  COM: 'Communications',
  CRM: 'Customer Relations',
  DAE: 'Data Acquisition Engine',
  DEV: 'Development Lifecycle',
  FIN: 'Finance',
  INT: 'Integrations',
  INV: 'Inventory Catalog',
  LOG: 'Logistics',
  MDM: 'Master Data',
  MKP: 'Marketplace',
  MKT: 'Market Intelligence',
  OPS: 'Operations',
  PRT: 'Partner',
  PUB: 'Publishing',
  SAL: 'Sales',
  SYS: 'System / Admin',
  WFL: 'Workflow',
  WRK: 'Workshop',
};

export function moduleLabel(code: string): string {
  return MODULE_NAMES[code] ?? code;
}
