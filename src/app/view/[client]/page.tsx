'use client';

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Client, Item, Ticket } from '@/lib/types';
import { StatusBadge, PriorityBadge, HealthBadge, DaysLeftBadge } from '@/components/ui/Badges';
import { fmtACV, fmtDate, daysLeft } from '@/lib/utils';

export default function ClientViewPage({ params }: { params: Promise<{ client: string }> }) {
  const [clientName, setClientName] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setClientName(decodeURIComponent(p.client)));
  }, [params]);

  useEffect(() => {
    if (!clientName) return;
    const supabase = createClient();
    const load = async () => {
      const { data: c } = await supabase.from('clients').select('*').ilike('name', clientName).single();
      if (c) {
        setClient(c);
        const { data: i } = await supabase.from('items').select('*').eq('client_id', c.id).order('section');
        if (i) setItems(i);
        const { data: t } = await supabase.from('tickets').select('*').eq('client_id', c.id).order('created_at', { ascending: false });
        if (t) setTickets(t);
      }
      setLoading(false);
    };
    load();
  }, [clientName]);

  const sections = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; overdue: number; blocked: number }>();
    items.forEach(item => {
      const sec = item.section || 'General';
      if (!map.has(sec)) map.set(sec, { total: 0, completed: 0, overdue: 0, blocked: 0 });
      const s = map.get(sec)!;
      s.total++;
      if (item.status === 'Completed') s.completed++;
      if (item.status === 'Blocked' || item.status === 'Delayed') s.blocked++;
      const d = daysLeft(item.eta);
      if (d !== null && d < 0 && item.status !== 'Completed') s.overdue++;
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const totalCompleted = items.filter(i => i.status === 'Completed').length;
  const overallPct = items.length > 0 ? Math.round((totalCompleted / items.length) * 100) : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-2 border-[#4556e0] border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Client not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#4556e0] rounded-xl flex items-center justify-center text-white font-bold text-sm">{client.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
              <p className="text-sm text-gray-400">{client.csm_name && <>CSM: {client.csm_name} · </>}{client.region} · {client.industry}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <HealthBadge health={client.health} />
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">{client.phase}</span>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">{client.renewal_status}</span>
            {client.acv > 0 && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">ACV {fmtACV(client.acv)}</span>}
            {client.renewal_date && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">Renewal: {fmtDate(client.renewal_date)}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Overall Progress</h2>
            <span className="text-sm font-bold text-[#4556e0]">{overallPct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{totalCompleted} of {items.length} items completed</p>
        </div>

        {sections.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-semibold mb-4">Sections</h2>
            <div className="space-y-4">
              {sections.map(([name, s]) => {
                const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{name}</span>
                      <span className="text-xs font-semibold text-gray-500">{s.completed}/{s.total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {(s.blocked > 0 || s.overdue > 0) && (
                      <div className="flex gap-3 mt-1">
                        {s.blocked > 0 && <span className="text-[10px] text-red-500">{s.blocked} blocked</span>}
                        {s.overdue > 0 && <span className="text-[10px] text-amber-500">{s.overdue} overdue</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 mb-6">
          <div className="px-5 py-4 border-b border-gray-50"><h2 className="text-sm font-semibold">Items ({items.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Section', 'Item', 'Priority', 'Status', 'Owner', 'ETA', 'Days Left'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500">{item.section}</td>
                    <td className="px-4 py-3 text-xs font-medium">{item.item}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.owner || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(item.eta)}</td>
                    <td className="px-4 py-3"><DaysLeftBadge days={daysLeft(item.eta)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {tickets.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 mb-6">
            <div className="px-5 py-4 border-b border-gray-50"><h2 className="text-sm font-semibold">Tickets ({tickets.length})</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Subject', 'Priority', 'Status', 'Created'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-medium">{t.subject}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 py-4">CSM Team Tracker</p>
      </div>
    </div>
  );
}
