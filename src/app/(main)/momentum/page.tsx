'use client';

import { useMemo } from 'react';
import { useClients, useItems } from '@/hooks/useData';
import { daysLeft } from '@/lib/utils';

export default function MomentumPage() {
  const { clients, loading: clientsLoading } = useClients();
  const { items, loading: itemsLoading } = useItems();

  const rows = useMemo(() => {
    return clients.map(c => {
      const cItems = items.filter(i => i.client_id === c.id);
      const total = cItems.length;
      const completed = cItems.filter(i => i.status === 'Completed').length;
      const inProgress = cItems.filter(i => i.status === 'In Progress').length;
      const blocked = cItems.filter(i => i.status === 'Blocked' || i.status === 'Delayed').length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const overdue = cItems.filter(i => { const d = daysLeft(i.eta); return d !== null && d < 0 && i.status !== 'Completed'; }).length;
      const next7 = cItems.filter(i => { const d = daysLeft(i.eta); return d !== null && d >= 0 && d <= 7 && i.status !== 'Completed'; }).length;
      return { client: c.name, csm: c.csm_name, health: c.health, total, completed, inProgress, blocked, pct, overdue, next7 };
    }).sort((a, b) => a.pct - b.pct);
  }, [clients, items]);

  if (clientsLoading || itemsLoading) return <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Momentum</h2>
        <p className="text-sm text-gray-400 mt-1">Implementation velocity by client — sorted slowest first</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {['Client', 'CSM', 'Progress', 'Completed', 'In Progress', 'Blocked', 'Overdue', 'Due ≤7d', 'Total', 'Health'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.client} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-[#4556e0] font-medium">{r.client}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.csm || '—'}</td>
                <td className="px-4 py-3 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right">{r.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-green-600 font-medium">{r.completed}</td>
                <td className="px-4 py-3 text-xs text-blue-600 font-medium">{r.inProgress}</td>
                <td className="px-4 py-3 text-xs">{r.blocked > 0 ? <span className="text-red-600 font-medium">{r.blocked}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="px-4 py-3 text-xs">{r.overdue > 0 ? <span className="text-red-600 font-medium">{r.overdue}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="px-4 py-3 text-xs">{r.next7 > 0 ? <span className="text-amber-600 font-medium">{r.next7}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.total}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${r.health === 'Green' ? 'bg-green-100 text-green-700' : r.health === 'Amber' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.health}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">No clients yet</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
