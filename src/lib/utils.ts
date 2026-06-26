export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function fmtACV(v: number | null | undefined): string {
  if (!v || isNaN(v)) return '—';
  return '$' + Number(v).toLocaleString('en-US');
}

export function daysLeft(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86400000);
}

export function statusColor(s: string): string {
  const map: Record<string, string> = {
    completed: '#12a06a', 'in progress': '#c47c17', pending: '#7756c4',
    'on hold': '#d03d3b', open: '#2979c2', waiting: '#c47c17',
    resolved: '#12a06a', closed: '#9499b8', blocked: '#d03d3b',
    delayed: '#d03d3b', 'not started': '#9499b8', 'pending client': '#7756c4',
  };
  return map[s?.toLowerCase() || ''] || '#7756c4';
}

export function priorityColor(p: string): string {
  const map: Record<string, string> = {
    p0: '#d03d3b', p1: '#d03d3b', p2: '#c47c17', p3: '#12a06a',
    critical: '#d03d3b', urgent: '#d03d3b', high: '#c47c17', medium: '#7756c4', low: '#12a06a',
  };
  return map[p?.toLowerCase() || ''] || '#7756c4';
}

export function healthColor(h: string): string {
  const map: Record<string, string> = { Green: '#12a06a', Amber: '#c47c17', Red: '#d03d3b' };
  return map[h] || '#9499b8';
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
