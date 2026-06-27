'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClients, useItems, useTickets, useActivityLog } from '@/hooks/useData';
import { HealthBadge, StatusBadge } from '@/components/ui/Badges';
import { fmtACV, fmtDate, daysLeft } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const { clients, loading: clientsLoading } = useClients();
  const { items, loading: itemsLoading } = useItems();
  const { tickets, loading: ticketsLoading } = useTickets();
  const { logs, loading: logsLoading } = useActivityLog();

  const loading = clientsLoading || itemsLoading || ticketsLoading || logsLoading;

  const stats = useMemo(() => {
    const totalACV = clients.reduce((s, c) => s + (c.acv || 0), 0);
    const atRisk = clients.filter(c => c.health === 'Red').length;
    const totalItems = items.length;
    const completedItems = items.filter(i => i.status === 'Completed').length;
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const overdueItems = items.filter(i => {
      const d = daysLeft(i.due_date || i.eta);
      return d !== null && d < 0 && i.status !== 'Completed';
    }).length;
    return { totalACV, atRisk, totalItems, completedItems, openTickets, overdueItems, clientCount: clients.length };
  }, [clients, items, tickets]);

  const healthData = useMemo(() => {
    const green = clients.filter(c => c.health === 'Green').length;
    const amber = clients.filter(c => c.health === 'Amber').length;
    const red = clients.filter(c => c.health === 'Red').length;
    return [
      { name: 'Green', value: green, color: '#12a06a' },
      { name: 'Amber', value: amber, color: '#c47c17' },
      { name: 'Red', value: red, color: '#d03d3b' },
    ].filter(d => d.value > 0);
  }, [clients]);

  const itemStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    items.forEach(i => { statuses[i.status] = (statuses[i.status] || 0) + 1; });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [items]);

  const atRiskItems = useMemo(() =>
    items.filter(i => {
      const d = daysLeft(i.due_date || i.eta);
      return (d !== null && d < 0 && i.status !== 'Completed') || i.status === 'Blocked';
    }).slice(0, 5),
  [items]);

  const upcomingRenewals = useMemo(() =>
    clients.filter(c => {
      const d = daysLeft(c.renewal_date);
      return d !== null && d >= 0 && d <= 90;
    }).sort((a, b) => (daysLeft(a.renewal_date) || 0) - (daysLeft(b.renewal_date) || 0)).slice(0, 5),
  [clients]);

  const recentTickets = useMemo(() =>
    tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').slice(0, 5),
  [tickets]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl border border-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">Overview of your CSM portfolio</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats.clientCount, sub: `ACV ${fmtACV(stats.totalACV)}`, color: '#4556e0' },
          { label: 'At Risk', value: stats.atRisk, sub: 'Red health clients', color: '#d03d3b' },
          { label: 'Items Completed', value: `${stats.completedItems}/${stats.totalItems}`, sub: stats.totalItems > 0 ? `${Math.round((stats.completedItems / stats.totalItems) * 100)}% complete` : 'No items', color: '#12a06a' },
          { label: 'Open Tickets', value: stats.openTickets, sub: `${stats.overdueItems} overdue items`, color: '#c47c17' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{card.label}</div>
            <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-4">Health Distribution</h3>
          {healthData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={healthData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {healthData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {healthData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-500">{d.name}</span>
                    <span className="text-xs font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No clients yet</p>
          )}
        </div>

        {/* Item Status */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-4">Item Status Breakdown</h3>
          {itemStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={itemStatusData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#4556e0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No items yet</p>
          )}
        </div>
      </div>

      {/* At-Risk Items + Upcoming Renewals + Open Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* At-Risk Items */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold">At-Risk Items</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {atRiskItems.map(item => (
              <div key={item.id} className="px-5 py-3">
                <div className="text-xs font-medium text-gray-700 truncate">{item.item}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{item.client_name}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
            {atRiskItems.length === 0 && <p className="px-5 py-6 text-xs text-gray-400 text-center">No at-risk items</p>}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold">Upcoming Renewals (90d)</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingRenewals.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-700">{c.name}</div>
                  <div className="text-[10px] text-gray-400">{fmtACV(c.acv)}</div>
                </div>
                <span className="text-xs font-semibold text-amber-600">{daysLeft(c.renewal_date)}d</span>
              </div>
            ))}
            {upcomingRenewals.length === 0 && <p className="px-5 py-6 text-xs text-gray-400 text-center">No upcoming renewals</p>}
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold">Open Tickets</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTickets.map(t => (
              <div key={t.id} className="px-5 py-3">
                <div className="text-xs font-medium text-gray-700 truncate">{t.subject}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{t.client_name}</span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {recentTickets.length === 0 && <p className="px-5 py-6 text-xs text-gray-400 text-center">No open tickets</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
