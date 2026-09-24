import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const range = req.nextUrl.searchParams.get('range') || '30';
  const days = parseInt(range, 10) || 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [campaigns, outputs, channels, clients] = await Promise.all([
    sb.from('bop_mkt_campaigns').select('id,status,objective,created_at,channels,languages,tenant_id').gte('created_at', since).order('created_at', { ascending: false }),
    sb.from('bop_mkt_outputs').select('id,campaign_id,channel,locale,status,created_at').gte('created_at', since),
    sb.from('bop_mkt_channels').select('channel,active').eq('active', true),
    sb.from('gr_clients').select('id,client_type,created_at'),
  ]);

  const campaignData = campaigns.data || [];
  const outputData = outputs.data || [];
  const channelData = channels.data || [];
  const clientData = clients.data || [];

  const statusCounts: Record<string, number> = {};
  for (const c of campaignData) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }

  const channelCounts: Record<string, number> = {};
  for (const o of outputData) {
    channelCounts[o.channel] = (channelCounts[o.channel] || 0) + 1;
  }

  const localeCounts: Record<string, number> = {};
  for (const o of outputData) {
    localeCounts[o.locale] = (localeCounts[o.locale] || 0) + 1;
  }

  const objectiveCounts: Record<string, number> = {};
  for (const c of campaignData) {
    objectiveCounts[c.objective] = (objectiveCounts[c.objective] || 0) + 1;
  }

  const dailyCampaigns: Record<string, number> = {};
  for (const c of campaignData) {
    const day = c.created_at?.slice(0, 10);
    if (day) dailyCampaigns[day] = (dailyCampaigns[day] || 0) + 1;
  }

  const dailyOutputs: Record<string, number> = {};
  for (const o of outputData) {
    const day = o.created_at?.slice(0, 10);
    if (day) dailyOutputs[day] = (dailyOutputs[day] || 0) + 1;
  }

  return NextResponse.json({
    range: days,
    totals: {
      campaigns: campaignData.length,
      outputs: outputData.length,
      channels_active: channelData.length,
      clients: clientData.length,
      clients_external: clientData.filter(c => c.client_type === 'external').length,
      clients_tenant: clientData.filter(c => c.client_type === 'des_tenant').length,
    },
    by_status: statusCounts,
    by_channel: channelCounts,
    by_locale: localeCounts,
    by_objective: objectiveCounts,
    daily_campaigns: dailyCampaigns,
    daily_outputs: dailyOutputs,
  });
}
