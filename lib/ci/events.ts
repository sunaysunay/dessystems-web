import { getServerClient } from '@/lib/supabase-server';

export interface CiEvent {
  tenant_id: number;
  event_ts: string;
  event_date: string;
  event_type: string;
  plane: 'A' | 'B';
  dedupe_key: string;
  anonymous_id?: string;
  customer_id?: string;
  session_id?: string;
  variant_id?: string;
  product_id?: string;
  category_id?: string;
  order_id?: string;
  order_line_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  device_type?: string;
  user_agent?: string;
  payload?: Record<string, unknown>;
}

export async function insertEvents(events: CiEvent[]): Promise<{ inserted: number; dupes: number }> {
  if (!events.length) return { inserted: 0, dupes: 0 };

  const supabase = getServerClient();
  let inserted = 0;
  let dupes = 0;

  const BATCH = 500;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('ci_events')
      .upsert(batch, { onConflict: 'tenant_id,dedupe_key,event_date', ignoreDuplicates: true })
      .select('id');

    if (error) throw new Error(`insertEvents batch ${i}: ${error.message}`);
    const batchInserted = data?.length ?? 0;
    inserted += batchInserted;
    dupes += batch.length - batchInserted;
  }

  return { inserted, dupes };
}

export function makeDedupe(eventType: string, ...parts: (string | number | undefined)[]): string {
  return [eventType, ...parts.filter(p => p != null)].join(':');
}
