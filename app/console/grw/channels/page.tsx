'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface ChannelConfig {
  channel: string;
  label: string;
  char_limit: number | null;
  supports_image: boolean;
  active: boolean;
}

const CHANNEL_ICONS: Record<string, string> = {
  linkedin: 'M4.98 3.5a2.49 2.49 0 100 4.98 2.49 2.49 0 000-4.98zM2.5 10h5v11h-5zM9.5 10h4.5v1.5s1.5-2 4.5-2c3 0 4 2 4 5v6.5h-5V16c0-1.5-.5-2.5-2-2.5s-2.5 1.5-2.5 3v5.5H9.5z',
  facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
  instagram: 'M4 4h16v16H4zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM17.5 6.5h.01',
  x: 'M4 4l7.1 8.5L4 20h1.7l5.5-5.8L16 20h4l-7.5-9L19.5 4H18l-5 5.3L8 4z',
  email: 'M3 5h18v14H3zM3 6l9 7 9-7',
  telegram: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  blog: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  google_business: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 6l4 4h-3v4h-2v-4H8l4-4z',
  marktplaats: 'M3 3h18v18H3zM7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7z',
};

export default function ChannelManagerPage() {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/mkt/meta')
      .then(r => r.json())
      .then(d => { setChannels(d.channels || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <ScreenHeader />

      <div className="text-sm text-muted">
        Publication channels available for marketing campaigns. Channels are configured in <code className="text-xs bg-card px-1 py-0.5 rounded border border-border">bop_mkt_channels</code> and used by the Content Studio and Campaign Manager.
      </div>

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Loading channels...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map(ch => (
            <div key={ch.channel} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-indigo-500/10 p-2 text-indigo-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={CHANNEL_ICONS[ch.channel] || 'M12 21a9 9 0 100-18 9 9 0 000 18z'} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{ch.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ch.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ch.active ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <div className="flex justify-between">
                      <span>Character limit</span>
                      <span className="font-mono">{ch.char_limit ?? '∞'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Image support</span>
                      <span>{ch.supports_image ? '✓' : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-2">Adding Channels</h3>
        <p className="text-xs text-muted">
          New publication channels (e.g. Google Ads, WhatsApp, specific marketplaces) can be added to the <code className="bg-card px-1 py-0.5 rounded border border-border">bop_mkt_channels</code> table. The Content Studio automatically generates content tailored to each channel's character limits and format requirements.
        </p>
      </div>
    </div>
  );
}
