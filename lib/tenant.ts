const TENANT_DEFAULTS: Record<string, number> = {
  console: 300,
  shop:    400,
  website: 500,
};

export function getTenantId(scope: keyof typeof TENANT_DEFAULTS = 'console'): number {
  const envKey = `TENANT_ID_${scope.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) return Number(envVal);
  return TENANT_DEFAULTS[scope] ?? 300;
}
