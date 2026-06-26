'use client';

import { statusColor, priorityColor, healthColor } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: statusColor(status) + '18', color: statusColor(status) }}
    >
      {status || '—'}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: priorityColor(priority) + '18', color: priorityColor(priority) }}
    >
      {priority || '—'}
    </span>
  );
}

export function HealthBadge({ health }: { health: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: healthColor(health) + '18', color: healthColor(health) }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: healthColor(health) }} />
      {health}
    </span>
  );
}

export function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-gray-300 text-xs">—</span>;
  const color = days < 0 ? '#d03d3b' : days <= 7 ? '#c47c17' : '#12a06a';
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
    </span>
  );
}
