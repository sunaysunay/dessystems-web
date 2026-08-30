import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import type {
  AutoflexConfig,
  AutoflexVehicle,
  AutoflexCustomer,
  AutoflexWorkOrder,
  AutoflexPart,
  AutoflexTestResult,
} from './types';

const DEFAULT_TIMEOUT = 15_000;

export class AutoflexClient {
  private endpoint: string;
  private apiKey: string;
  private dealerId: string;
  private timeout: number;

  constructor(config: AutoflexConfig) {
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.dealerId = config.dealerId;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  private async _request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.endpoint}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Dealer-Id': this.dealerId,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Autoflex API ${method} ${path} returned ${res.status}: ${text}`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Autoflex API ${method} ${path} timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async testConnection(): Promise<AutoflexTestResult> {
    const start = Date.now();
    try {
      const data = await this._request<{
        version?: string;
        dealerName?: string;
        capabilities?: string[];
      }>('GET', '/api/v1/health');

      return {
        connected: true,
        version: data.version ?? null,
        dealerName: data.dealerName ?? null,
        latencyMs: Date.now() - start,
        error: null,
        capabilities: data.capabilities ?? [],
      };
    } catch (err: any) {
      return {
        connected: false,
        version: null,
        dealerName: null,
        latencyMs: Date.now() - start,
        error: err.message ?? String(err),
        capabilities: [],
      };
    }
  }

  async getVehicles(params?: {
    plate?: string;
    vin?: string;
    limit?: number;
  }): Promise<AutoflexVehicle[]> {
    const qs = new URLSearchParams();
    if (params?.plate) qs.set('plate', params.plate);
    if (params?.vin) qs.set('vin', params.vin);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return this._request<AutoflexVehicle[]>('GET', `/api/v1/vehicles${query ? `?${query}` : ''}`);
  }

  async getVehicle(id: string): Promise<AutoflexVehicle> {
    return this._request<AutoflexVehicle>('GET', `/api/v1/vehicles/${encodeURIComponent(id)}`);
  }

  async getCustomers(params?: {
    search?: string;
    limit?: number;
  }): Promise<AutoflexCustomer[]> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return this._request<AutoflexCustomer[]>('GET', `/api/v1/customers${query ? `?${query}` : ''}`);
  }

  async getWorkOrders(params?: {
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AutoflexWorkOrder[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return this._request<AutoflexWorkOrder[]>('GET', `/api/v1/work-orders${query ? `?${query}` : ''}`);
  }

  async createWorkOrder(data: Partial<AutoflexWorkOrder>): Promise<AutoflexWorkOrder> {
    return this._request<AutoflexWorkOrder>('POST', '/api/v1/work-orders', data);
  }

  async getParts(params?: {
    search?: string;
    category?: string;
    limit?: number;
  }): Promise<AutoflexPart[]> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return this._request<AutoflexPart[]>('GET', `/api/v1/parts${query ? `?${query}` : ''}`);
  }

  static async fromSupabase(): Promise<AutoflexClient | null> {
    const supabase = getServerClient();
    const tenantId = getTenantId('console');

    const { data, error } = await supabase
      .from('wrk_autoflex_config')
      .select('endpoint, api_key, dealer_id, timeout, enabled')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) return null;
    if (!data.enabled) return null;

    return new AutoflexClient({
      endpoint: data.endpoint,
      apiKey: data.api_key,
      dealerId: data.dealer_id,
      timeout: data.timeout ?? DEFAULT_TIMEOUT,
      enabled: data.enabled,
    });
  }
}

export default AutoflexClient;
