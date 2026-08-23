import { getServerClient } from '@/lib/supabase-server';

export interface AdSpendRow {
  tenant_id: number;
  fact_date: string;
  channel: string;
  campaign_name: string | null;
  campaign_id: string | null;
  adset_name: string | null;
  adset_id: string | null;
  spend_cents: number;
  spend_currency: string;
  fx_rate: number;
  spend_eur_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value_cents: number;
  restated: boolean;
}

export interface AdChannel {
  name: string;
  fetchDailySpend(tenantId: number, date: string): Promise<AdSpendRow[]>;
  hasCredentials(): boolean;
}

export function convertToEur(spendCents: number, fxRate: number): number {
  if (fxRate <= 0) return spendCents;
  return Math.round(spendCents / fxRate);
}

export async function importAdSpend(
  tenantId: number,
  channel: AdChannel,
  dates: string[],
): Promise<{ imported: number; restated: number; errors: string[] }> {
  const sb = getServerClient();
  let imported = 0;
  let restated = 0;
  const errors: string[] = [];

  if (!channel.hasCredentials()) {
    await sb.from('ci_data_health').upsert({
      tenant_id: tenantId,
      check_name: `ad_spend_${channel.name}_creds`,
      status: 'amber',
      message: `Missing credentials for ${channel.name}`,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,check_name' });
    errors.push(`Missing credentials for ${channel.name}`);
    return { imported: 0, restated: 0, errors };
  }

  for (const date of dates) {
    try {
      const rows = await channel.fetchDailySpend(tenantId, date);

      for (const row of rows) {
        const { data: existing } = await sb
          .from('ci_ad_spend_daily')
          .select('id, spend_eur_cents')
          .eq('tenant_id', tenantId)
          .eq('fact_date', date)
          .eq('channel', channel.name)
          .eq('campaign_id', row.campaign_id || '')
          .eq('adset_id', row.adset_id || '')
          .maybeSingle();

        const isRestate = existing && existing.spend_eur_cents !== row.spend_eur_cents;

        await sb.from('ci_ad_spend_daily').upsert({
          ...row,
          restated: isRestate || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,fact_date,channel,campaign_id,adset_id',
        });

        if (isRestate) restated++;
        else imported++;
      }
    } catch (err: any) {
      errors.push(`${channel.name} ${date}: ${err.message}`);
    }
  }

  return { imported, restated, errors };
}

export function getImportDates(lookbackDays = 7): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= lookbackDays; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export const googleAdsChannel: AdChannel = {
  name: 'google_ads',
  hasCredentials() {
    return !!(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_REFRESH_TOKEN);
  },
  async fetchDailySpend(_tenantId: number, _date: string): Promise<AdSpendRow[]> {
    // Placeholder — actual Google Ads API integration
    return [];
  },
};

export const metaAdsChannel: AdChannel = {
  name: 'meta',
  hasCredentials() {
    return !!(process.env.META_ADS_ACCESS_TOKEN);
  },
  async fetchDailySpend(_tenantId: number, _date: string): Promise<AdSpendRow[]> {
    // Placeholder — actual Meta Marketing API integration
    return [];
  },
};
