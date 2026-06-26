'use client';

import { useActivityLog } from '@/hooks/useData';
import { fmtDate } from '@/lib/utils';

export default function ActivityPage() {
  const { logs, loading } = useActivityLog();

  if (loading) return <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-sm text-gray-400 mt-1">Recent changes across the tracker</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold">{logs.length} events</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {logs.map(log => {
            const color = log.type === 'create' ? 'bg-green-500' : log.type === 'delete' ? 'bg-red-500' : 'bg-blue-500';
            const label = log.type === 'create' ? 'Created' : log.type === 'delete' ? 'Deleted' : 'Updated';
            return (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color.includes('green') ? '#12a06a' : color.includes('red') ? '#d03d3b' : '#2979c2' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-800">{log.actor || 'System'}</span>
                    <span className="text-gray-400 mx-1">{label.toLowerCase()}</span>
                    <span className="font-medium text-[#4556e0]">{log.client}</span>
                  </p>
                  {log.message && <p className="text-xs text-gray-400 mt-0.5">{log.message}</p>}
                </div>
                <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{fmtDate(log.created_at)}</span>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="px-5 py-12 text-center text-gray-400 text-sm">No activity recorded yet</div>
          )}
        </div>
      </div>
    </>
  );
}
