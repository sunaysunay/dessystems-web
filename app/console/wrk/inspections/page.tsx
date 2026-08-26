'use client';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function InspectionChecklistPage() {
  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">Inspection Checklist</p>
        <p className="text-sm mt-2">Digital vehicle inspection with photo report — coming soon</p>
      </div>
    </div>
  );
}
