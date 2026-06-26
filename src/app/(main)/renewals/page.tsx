'use client';

import { useMemo } from 'react';
import { useClients } from '@/hooks/useData';
import { fmtACV, fmtDate, daysLeft } from '@/lib/utils';

export default function RenewalsPage() {
  const { clients, loading } = useClients();

  const withDates = useMemo(() => clients.filter(c => c.renewal_date), [clients]);
  const overdue = useMemo(() => withDates.filter(c => { const d = daysLeft(c.renewal_date); return d !== null && d < 0; }), [withDates]);
  const upcoming = useMemo(() => withDates.filter(c => { const d = daysLeft(c.renewal_date); return d !== null && d >= 0 && d <= 90; }), [withDates]);
  const future = useMemo(() => withDates.filter(c => { const d = daysLeft(c.renewal_date); return d !== null && d > 90; }), [withDates]);

  const overdueACV = overdue.reduce((s, c) => s + (c.acv || 0), 0);
  const upcomingACV = upcoming.reduce((s, c) => s + (c.acv || 0), 0);

  if (loading) return <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />;

  const Section = ({ title, list }: { title: string; list: typeof clients }) => (
    <div className="bg-white rounded-xl border border-gray-100 mb-6">
      <div className="px-5 py-4 border-b border-gray-50"><h3 className="text-sm font-semibold">{title}</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {['Client', 'Renewal Date', 'Days Left', 'ACV', 'Status', 'Health'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(c => {
              const days = daysLeft(c.renewal_date);
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-[#4556e0] font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.renewal_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${days !== null && days < 0 ? 'text-red-600' : days !== null && days <= 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-green-600 font-mono text-xs">{fmtACV(c.acv)}</td>
                  <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">{c.renewal_status || '—'}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.health === 'Green' ? 'bg-green-100 text-green-700' : c.health === 'Amber' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.health}</span></td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">None</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Renewals</h2>
        <p className="text-sm text-gray-400 mt-1">Upcoming renewals pipeline</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
          <div className="text-xs text-red-600 font-medium">Overdue — {fmtACV(overdueACV)}</div>
        </div>
        <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{upcoming.length}</div>
          <div className="text-xs text-amber-600 font-medium">Next 90 days — {fmtACV(upcomingACV)}</div>
        </div>
        <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{future.length}</div>
          <div className="text-xs text-blue-600 font-medium">Future</div>
        </div>
      </div>
      <Section title="Overdue Renewals" list={overdue} />
      <Section title="Renewals in Next 90 Days" list={upcoming} />
      <Section title="Future Renewals" list={future} />
    </>
  );
}
