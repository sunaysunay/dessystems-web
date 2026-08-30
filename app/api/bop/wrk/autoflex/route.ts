export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { AutoflexClient } from '@/lib/wrk/autoflex/client';
import {
  mapAutoflexVehicleToAsset,
  mapAutoflexCustomerToCRM,
  mapAutoflexOrderToWrk,
  mapAutoflexPartToSHP,
} from '@/lib/wrk/autoflex/mappers';
import type { AutoflexSyncResult } from '@/lib/wrk/autoflex/types';

const TENANT_ID = getTenantId('console');

// ---------------------------------------------------------------------------
// GET — current config (masked key) + connection status
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from('wrk_autoflex_config')
    .select('endpoint, api_key, dealer_id, timeout, enabled, updated_at')
    .eq('tenant_id', TENANT_ID)
    .single();

  if (error || !data) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    endpoint: data.endpoint,
    apiKey: data.api_key ? `****${data.api_key.slice(-4)}` : null,
    dealerId: data.dealer_id,
    timeout: data.timeout,
    enabled: data.enabled,
    updatedAt: data.updated_at,
  });
}

// ---------------------------------------------------------------------------
// POST — multi-action handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { action } = body;

  // ── save_config ──────────────────────────────────────────────────────
  if (action === 'save_config') {
    const { endpoint, api_key, dealer_id, timeout_ms, enabled } = body;

    if (!endpoint || !api_key || !dealer_id) {
      return NextResponse.json(
        { error: 'endpoint, api_key, and dealer_id are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('wrk_autoflex_config')
      .upsert(
        {
          tenant_id: TENANT_ID,
          endpoint,
          api_key,
          dealer_id,
          timeout: timeout_ms ?? 15000,
          enabled: enabled ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' },
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  }

  // ── test_connection ──────────────────────────────────────────────────
  if (action === 'test_connection') {
    const client = await AutoflexClient.fromSupabase();
    if (!client) {
      return NextResponse.json(
        { error: 'No Autoflex configuration found or integration is disabled' },
        { status: 400 },
      );
    }

    const result = await client.testConnection();
    return NextResponse.json(result);
  }

  // ── sync_vehicles ────────────────────────────────────────────────────
  if (action === 'sync_vehicles') {
    return handleSync('vehicles', async () => {
      const client = await requireClient();
      const vehicles = await client.getVehicles({ limit: 50 });

      const result = emptySyncResult();

      for (const v of vehicles) {
        try {
          const row = { ...mapAutoflexVehicleToAsset(v), tenant_id: TENANT_ID };
          const { error } = await supabase
            .from('ast_assets')
            .upsert(row, { onConflict: 'license_plate' });
          if (error) throw new Error(error.message);
          result.synced++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Vehicle ${v.licensePlate}: ${err.message}`);
        }
      }

      return result;
    });
  }

  // ── sync_work_orders ─────────────────────────────────────────────────
  if (action === 'sync_work_orders') {
    return handleSync('work_orders', async () => {
      const client = await requireClient();
      const orders = await client.getWorkOrders({ limit: 50 });

      const result = emptySyncResult();

      for (const wo of orders) {
        try {
          // Skip if wo_number already exists
          const { data: existing } = await supabase
            .from('wrk_orders')
            .select('id')
            .eq('wo_number', wo.orderNumber)
            .eq('tenant_id', TENANT_ID)
            .maybeSingle();

          if (existing) {
            continue; // already exists, skip
          }

          const { lines, ...orderRow } = mapAutoflexOrderToWrk(wo);
          const { error } = await supabase
            .from('wrk_orders')
            .insert({ ...orderRow, tenant_id: TENANT_ID });
          if (error) throw new Error(error.message);
          result.synced++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`WO ${wo.orderNumber}: ${err.message}`);
        }
      }

      return result;
    });
  }

  // ── sync_customers ───────────────────────────────────────────────────
  if (action === 'sync_customers') {
    return handleSync('customers', async () => {
      const client = await requireClient();
      const customers = await client.getCustomers({ limit: 50 });

      const result = emptySyncResult();

      for (const c of customers) {
        try {
          if (!c.email) {
            result.failed++;
            result.errors.push(`Customer ${c.id}: no email, cannot upsert`);
            continue;
          }

          const row = { ...mapAutoflexCustomerToCRM(c), tenant_id: TENANT_ID };
          const { error } = await supabase
            .from('crm_leads')
            .upsert(row, { onConflict: 'email' });
          if (error) throw new Error(error.message);
          result.synced++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Customer ${c.name}: ${err.message}`);
        }
      }

      return result;
    });
  }

  // ── sync_parts ───────────────────────────────────────────────────────
  if (action === 'sync_parts') {
    return handleSync('parts', async () => {
      const client = await requireClient();
      const parts = await client.getParts({ limit: 100 });

      const result = emptySyncResult();

      for (const p of parts) {
        try {
          const row = { ...mapAutoflexPartToSHP(p), tenant_id: TENANT_ID };
          const { error } = await supabase
            .from('shp_products')
            .upsert(row, { onConflict: 'sku' });
          if (error) throw new Error(error.message);
          result.synced++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Part ${p.partNumber}: ${err.message}`);
        }
      }

      return result;
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireClient(): Promise<AutoflexClient> {
  const client = await AutoflexClient.fromSupabase();
  if (!client) throw new Error('No Autoflex configuration found or integration is disabled');
  return client;
}

function emptySyncResult(): AutoflexSyncResult {
  return {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };
}

async function handleSync(
  syncType: string,
  fn: () => Promise<AutoflexSyncResult>,
): Promise<NextResponse> {
  const start = Date.now();
  try {
    const result = await fn();
    result.success = result.failed === 0;

    // Log the sync (best-effort)
    const supabase = getServerClient();
    await supabase
      .from('wrk_autoflex_sync_logs')
      .insert({
        tenant_id: TENANT_ID,
        sync_type: syncType,
        direction: 'pull',
        records_synced: result.synced,
        records_failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : null,
        duration_ms: Date.now() - start,
      })
      .then(() => {});

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, success: false },
      { status: 500 },
    );
  }
}
