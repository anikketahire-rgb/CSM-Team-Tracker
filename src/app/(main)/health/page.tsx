'use client';

import { useClients } from '@/hooks/useData';
import { HealthBadge } from '@/components/ui/Badges';

export default function HealthPage() {
  const { clients, loading } = useClients();

  if (loading) return <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />;

  const green = clients.filter(c => c.health === 'Green');
  const amber = clients.filter(c => c.health === 'Amber');
  const red = clients.filter(c => c.health === 'Red');

  const Section = ({ title, color, list }: { title: string; color: string; list: typeof clients }) => (
    <div className="bg-white rounded-xl border border-gray-100 mb-6">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-gray-400 ml-auto">{list.length} client{list.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {list.map(c => (
          <div key={c.id} className="px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-medium text-[#4556e0] min-w-[160px]">{c.name}</span>
            <span className="text-xs text-gray-400">{c.csm_name || '—'}</span>
            <span className="text-xs text-gray-400">{c.region || '—'}</span>
            <span className="text-xs text-gray-400">{c.industry || '—'}</span>
            <HealthBadge health={c.health} />
          </div>
        ))}
        {list.length === 0 && <p className="px-5 py-6 text-xs text-gray-400 text-center">None</p>}
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Health Monitor</h2>
        <p className="text-sm text-gray-400 mt-1">Client health distribution</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-green-600">{green.length}</div>
          <div className="text-xs text-green-600 font-medium">Green</div>
        </div>
        <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{amber.length}</div>
          <div className="text-xs text-amber-600 font-medium">Amber</div>
        </div>
        <div className="bg-red-50 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-red-600">{red.length}</div>
          <div className="text-xs text-red-600 font-medium">Red</div>
        </div>
      </div>
      <Section title="Red — At Risk" color="#d03d3b" list={red} />
      <Section title="Amber — Needs Attention" color="#c47c17" list={amber} />
      <Section title="Green — Healthy" color="#12a06a" list={green} />
    </>
  );
}
