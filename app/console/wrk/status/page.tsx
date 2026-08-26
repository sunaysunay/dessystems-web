'use client';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function CustomerStatusPage() {
  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">Customer Status</p>
        <p className="text-sm mt-2">Customer-facing work order status — coming soon</p>
      </div>
    </div>
  );
}
