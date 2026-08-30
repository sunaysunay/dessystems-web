'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Kpi } from '@/components/CockpitKit';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface AutoflexConfig {
  api_endpoint: string;
  api_key: string;
  dealer_id: string;
  timeout: number;
  enabled: boolean;
}

interface TestResult {
  success: boolean;
  latency_ms?: number;
  dealer_name?: string;
  capabilities?: string[];
  error?: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  duration_ms: number;
}

interface SyncLog {
  id: string;
  type: string;
  direction: string;
  synced: number;
  failed: number;
  duration_ms: number;
  created_at: string;
}

type SyncType = 'vehicles' | 'work_orders' | 'customers' | 'parts';
type MappingTab = 'vehicles' | 'work_orders' | 'customers' | 'parts';

interface FieldMapping {
  source: string;
  target: string;
  status: 'mapped' | 'partial' | 'missing';
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const SYNC_SECTIONS: { key: SyncType; title: string; action: string }[] = [
  { key: 'vehicles', title: 'Voertuigen', action: 'sync_vehicles' },
  { key: 'work_orders', title: 'Werkorders', action: 'sync_work_orders' },
  { key: 'customers', title: 'Klanten', action: 'sync_customers' },
  { key: 'parts', title: 'Onderdelen', action: 'sync_parts' },
];

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: 'vehicles', label: 'Voertuigen' },
  { value: 'work_orders', label: 'Werkorders' },
  { value: 'customers', label: 'Klanten' },
  { value: 'parts', label: 'Onderdelen' },
];

const MAPPING_TABS: { key: MappingTab; label: string; sourceLabel: string; targetLabel: string }[] = [
  { key: 'vehicles', label: 'Voertuigen → AST Assets', sourceLabel: 'Autoflex Veld', targetLabel: 'AST Veld' },
  { key: 'work_orders', label: 'Werkorders → WRK Orders', sourceLabel: 'Autoflex Veld', targetLabel: 'WRK Veld' },
  { key: 'customers', label: 'Klanten → CRM Leads', sourceLabel: 'Autoflex Veld', targetLabel: 'CRM Veld' },
  { key: 'parts', label: 'Onderdelen → SHP Products', sourceLabel: 'Autoflex Veld', targetLabel: 'SHP Veld' },
];

const FIELD_MAPPINGS: Record<MappingTab, FieldMapping[]> = {
  vehicles: [
    { source: 'voertuig_id', target: 'asset_id', status: 'mapped' },
    { source: 'kenteken', target: 'license_plate', status: 'mapped' },
    { source: 'merk', target: 'brand', status: 'mapped' },
    { source: 'model', target: 'model', status: 'mapped' },
    { source: 'bouwjaar', target: 'year', status: 'mapped' },
    { source: 'chassisnummer', target: 'vin', status: 'mapped' },
    { source: 'kleur', target: 'color', status: 'mapped' },
    { source: 'brandstof', target: 'fuel_type', status: 'mapped' },
    { source: 'km_stand', target: 'mileage', status: 'mapped' },
    { source: 'apk_vervaldatum', target: 'mot_expiry', status: 'mapped' },
    { source: 'eigenaar_id', target: 'owner_contact_id', status: 'partial' },
    { source: 'notities', target: 'notes', status: 'missing' },
  ],
  work_orders: [
    { source: 'werkorder_id', target: 'wo_id', status: 'mapped' },
    { source: 'werkorder_nummer', target: 'wo_number', status: 'mapped' },
    { source: 'voertuig_id', target: 'asset_id', status: 'mapped' },
    { source: 'klant_id', target: 'customer_id', status: 'mapped' },
    { source: 'status', target: 'status', status: 'mapped' },
    { source: 'type', target: 'wo_type', status: 'mapped' },
    { source: 'omschrijving', target: 'description', status: 'mapped' },
    { source: 'monteur_id', target: 'technician_id', status: 'partial' },
    { source: 'gepland_start', target: 'scheduled_start', status: 'mapped' },
    { source: 'gepland_eind', target: 'scheduled_end', status: 'mapped' },
    { source: 'arbeidstijd', target: 'labour_hours', status: 'mapped' },
    { source: 'totaal_bedrag', target: 'total_amount', status: 'mapped' },
  ],
  customers: [
    { source: 'klant_id', target: 'lead_id', status: 'mapped' },
    { source: 'naam', target: 'name', status: 'mapped' },
    { source: 'email', target: 'email', status: 'mapped' },
    { source: 'telefoon', target: 'phone', status: 'mapped' },
    { source: 'adres', target: 'address', status: 'mapped' },
    { source: 'postcode', target: 'postal_code', status: 'mapped' },
    { source: 'plaats', target: 'city', status: 'mapped' },
    { source: 'kvk_nummer', target: 'chamber_of_commerce', status: 'partial' },
    { source: 'btw_nummer', target: 'vat_number', status: 'partial' },
    { source: 'type', target: 'customer_type', status: 'mapped' },
  ],
  parts: [
    { source: 'artikel_id', target: 'product_id', status: 'mapped' },
    { source: 'artikelnummer', target: 'sku', status: 'mapped' },
    { source: 'omschrijving', target: 'name', status: 'mapped' },
    { source: 'categorie', target: 'category', status: 'mapped' },
    { source: 'inkoopprijs', target: 'cost_price', status: 'mapped' },
    { source: 'verkoopprijs', target: 'sell_price', status: 'mapped' },
    { source: 'voorraad', target: 'stock_qty', status: 'mapped' },
    { source: 'min_voorraad', target: 'min_stock', status: 'partial' },
    { source: 'leverancier', target: 'supplier', status: 'missing' },
    { source: 'locatie', target: 'warehouse_location', status: 'missing' },
  ],
};

const STATUS_ICON: Record<string, { color: string; label: string }> = {
  mapped: { color: '#16a34a', label: 'Gekoppeld' },
  partial: { color: '#d97706', label: 'Gedeeltelijk' },
  missing: { color: '#dc2626', label: 'Ontbreekt' },
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Zojuist';
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days > 1 ? 'en' : ''} geleden`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()} ${hh}:${mi}`;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function DmsIntegrationPage() {
  const [config, setConfig] = useState<AutoflexConfig>({
    api_endpoint: '',
    api_key: '',
    dealer_id: '',
    timeout: 30000,
    enabled: false,
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [syncLoading, setSyncLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logFilter, setLogFilter] = useState('');
  const [activeTab, setActiveTab] = useState<MappingTab>('vehicles');
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  /* ── Data loading ────────────────────────────────────────────────────────── */

  function loadConfig() {
    setConfigLoading(true);
    fetch('/api/bop/wrk/autoflex')
      .then(r => r.json())
      .then(j => {
        if (j.config) {
          setConfig(j.config);
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }

  function loadLogs() {
    setLogsLoading(true);
    const params = new URLSearchParams();
    if (logFilter) params.set('type', logFilter);
    fetch(`/api/bop/wrk/autoflex/logs?${params}`)
      .then(r => r.json())
      .then(j => { setLogs(j.data ?? []); })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }

  useEffect(() => { loadConfig(); }, []);
  useEffect(() => { loadLogs(); }, [logFilter]);

  /* ── Actions ─────────────────────────────────────────────────────────────── */

  function saveConfig() {
    setConfigSaving(true);
    fetch('/api/bop/wrk/autoflex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_config', config }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Fout: ${j.error}`); return; }
        showToast('Configuratie opgeslagen');
      })
      .catch(e => showToast(`Fout: ${e.message}`))
      .finally(() => setConfigSaving(false));
  }

  function testConnection() {
    setTestLoading(true);
    setTestResult(null);
    fetch('/api/bop/wrk/autoflex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_connection', config }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { setTestResult({ success: false, error: j.error }); return; }
        setTestResult(j.result);
      })
      .catch(e => setTestResult({ success: false, error: e.message }))
      .finally(() => setTestLoading(false));
  }

  function runSync(syncType: SyncType, action: string) {
    setSyncLoading(prev => ({ ...prev, [syncType]: true }));
    fetch('/api/bop/wrk/autoflex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) {
          setSyncResults(prev => ({
            ...prev,
            [syncType]: { success: false, synced: 0, failed: 0, errors: [j.error], duration_ms: 0 },
          }));
          return;
        }
        setSyncResults(prev => ({ ...prev, [syncType]: j.result }));
        loadLogs();
      })
      .catch(e => {
        setSyncResults(prev => ({
          ...prev,
          [syncType]: { success: false, synced: 0, failed: 0, errors: [e.message], duration_ms: 0 },
        }));
      })
      .finally(() => setSyncLoading(prev => ({ ...prev, [syncType]: false })));
  }

  /* ── Computed ─────────────────────────────────────────────────────────────── */

  const connectionStatus = !config.api_endpoint
    ? { label: 'Niet Geconfigureerd', color: '#9ca3af' }
    : config.enabled
      ? { label: 'Verbonden', color: '#16a34a' }
      : { label: 'Uitgeschakeld', color: '#d97706' };

  const lastSync = logs.length > 0 ? timeAgo(logs[0].created_at) : 'Nooit';
  const totalSynced = logs.reduce((s, l) => s + l.synced, 0);
  const totalErrors = logs.reduce((s, l) => s + l.failed, 0);

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <ScreenHeader screenId="WK013" />

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi
          label="Verbindingsstatus"
          value={connectionStatus.label}
          color={connectionStatus.color}
        />
        <Kpi label="Laatste Sync" value={lastSync} />
        <Kpi label="Records Gesynchroniseerd" value={totalSynced} />
        <Kpi
          label="Sync Fouten"
          value={totalErrors}
          color={totalErrors > 0 ? '#dc2626' : undefined}
        />
      </div>

      {/* Connection Configuration */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
          Verbinding Configuratie
        </p>
        {configLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 14 }}>Laden...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>API Endpoint</label>
              <input
                type="text"
                value={config.api_endpoint}
                onChange={e => setConfig(prev => ({ ...prev, api_endpoint: e.target.value }))}
                placeholder="https://api.autoflex.nl/v2"
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>API Key</label>
              <input
                type="password"
                value={config.api_key}
                onChange={e => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Dealer ID</label>
              <input
                type="text"
                value={config.dealer_id}
                onChange={e => setConfig(prev => ({ ...prev, dealer_id: e.target.value }))}
                placeholder="DLR-001"
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Timeout (ms)</label>
              <input
                type="number"
                value={config.timeout}
                onChange={e => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: 'span 2' }}>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Integratie Ingeschakeld</label>
            </div>
            <div style={{ display: 'flex', gap: 8, gridColumn: 'span 2' }}>
              <button
                onClick={saveConfig}
                disabled={configSaving}
                style={{
                  padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#fff',
                  background: configSaving ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >
                {configSaving ? 'Opslaan...' : 'Configuratie Opslaan'}
              </button>
              <button
                onClick={testConnection}
                disabled={testLoading}
                style={{
                  padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#475569',
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer',
                }}
              >
                {testLoading ? 'Testen...' : 'Test Verbinding'}
              </button>
            </div>

            {/* Test result */}
            {testResult && (
              <div
                style={{
                  gridColumn: 'span 2', padding: 12, borderRadius: 6, fontSize: 13,
                  background: testResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                  color: testResult.success ? '#166534' : '#991b1b',
                }}
              >
                {testResult.success ? (
                  <div>
                    <strong>Verbinding succesvol</strong> ({testResult.latency_ms}ms)
                    {testResult.dealer_name && <span> — {testResult.dealer_name}</span>}
                    {testResult.capabilities && testResult.capabilities.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                        Mogelijkheden: {testResult.capabilities.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div><strong>Verbinding mislukt:</strong> {testResult.error}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Sync */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
          Data Synchronisatie
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SYNC_SECTIONS.map(sec => {
            const isLoading = syncLoading[sec.key] ?? false;
            const result = syncResults[sec.key];
            const lastLog = logs.find(l => l.type === sec.key);
            return (
              <div key={sec.key} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{sec.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Pull van Autoflex</div>
                  </div>
                  <button
                    onClick={() => runSync(sec.key, sec.action)}
                    disabled={isLoading || !config.enabled}
                    style={{
                      padding: '5px 14px', fontSize: 11, fontWeight: 600, color: '#fff',
                      background: isLoading ? '#93c5fd' : !config.enabled ? '#cbd5e1' : '#2563eb',
                      border: 'none', borderRadius: 6, cursor: config.enabled ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isLoading ? 'Synchroniseren...' : 'Sync Nu'}
                  </button>
                </div>
                {lastLog && (
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                    Laatste: {timeAgo(lastLog.created_at)} — {lastLog.synced} gesynchroniseerd, {lastLog.failed} mislukt
                  </div>
                )}
                {result && (
                  <div
                    style={{
                      marginTop: 6, padding: 8, borderRadius: 4, fontSize: 12,
                      background: result.failed === 0 ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${result.failed === 0 ? '#bbf7d0' : '#fecaca'}`,
                      color: result.failed === 0 ? '#166534' : '#991b1b',
                    }}
                  >
                    <div>{result.synced} gesynchroniseerd, {result.failed} mislukt ({fmtDuration(result.duration_ms)})</div>
                    {result.errors.length > 0 && (
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11 }}>
                        {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync History */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: 0 }}>
            Sync Geschiedenis
          </p>
          <select
            value={logFilter}
            onChange={e => setLogFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, color: '#475569', outline: 'none' }}
          >
            {TYPE_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {logsLoading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>Laden...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>Geen sync logs gevonden</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Tijd', 'Type', 'Richting', 'Gesynchroniseerd', 'Mislukt', 'Duur'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const status = log.failed === 0 ? 'success' : log.synced > 0 ? 'partial' : 'failed';
                  const statusColor = status === 'success' ? '#16a34a' : status === 'partial' ? '#d97706' : '#dc2626';
                  const statusBg = status === 'success' ? '#f0fdf4' : status === 'partial' ? '#fffbeb' : '#fef2f2';
                  const statusLabel = status === 'success' ? 'OK' : status === 'partial' ? 'Deels' : 'Mislukt';
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 14px', color: '#475569' }}>{fmtDateTime(log.created_at)}</td>
                      <td style={{ padding: '8px 14px', color: '#475569', textTransform: 'capitalize' }}>
                        {log.type.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '8px 14px', color: '#475569' }}>{log.direction}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#1e293b' }}>{log.synced}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: statusBg, color: statusColor,
                        }}>
                          {log.failed} {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{fmtDuration(log.duration_ms)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Mapping Validation */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 12 }}>
          Data Mapping Validatie
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 14 }}>
          {MAPPING_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: activeTab === tab.key ? '#2563eb' : '#94a3b8',
                borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mapping table */}
        {(() => {
          const tab = MAPPING_TABS.find(t => t.key === activeTab)!;
          const mappings = FIELD_MAPPINGS[activeTab];
          const mapped = mappings.filter(m => m.status === 'mapped').length;
          const partial = mappings.filter(m => m.status === 'partial').length;
          const missing = mappings.filter(m => m.status === 'missing').length;
          return (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{mapped} Gekoppeld</span>
                <span style={{ color: '#d97706', fontWeight: 600 }}>{partial} Gedeeltelijk</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>{missing} Ontbreekt</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                        {tab.sourceLabel}
                      </th>
                      <th style={{ padding: '8px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8' }}></th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                        {tab.targetLabel}
                      </th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '6px 14px', color: '#475569', fontFamily: 'monospace', fontSize: 12 }}>{m.source}</td>
                        <td style={{ padding: '6px 14px', textAlign: 'center', color: '#94a3b8' }}>&#8594;</td>
                        <td style={{ padding: '6px 14px', color: '#475569', fontFamily: 'monospace', fontSize: 12 }}>{m.target}</td>
                        <td style={{ padding: '6px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                            color: STATUS_ICON[m.status].color,
                          }}>
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: STATUS_ICON[m.status].color, display: 'inline-block',
                            }} />
                            {STATUS_ICON[m.status].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
