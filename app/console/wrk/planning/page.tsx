'use client';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function PlanningBoardPage() {
  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">Planning Board</p>
        <p className="text-sm mt-2">Technician × time slot planning — coming soon</p>
      </div>
    </div>
  );
}
