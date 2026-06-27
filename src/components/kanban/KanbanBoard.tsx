'use client';

import { useMemo, useState } from 'react';
import { Item, CustomStatus } from '@/lib/types';
import { daysLeft, fmtDate, priorityColor, statusColor } from '@/lib/utils';

interface KanbanBoardProps {
  items: Item[];
  statuses: CustomStatus[];
  onItemClick: (item: Item) => void;
  clientNameMap: Map<string, string>;
}

export default function KanbanBoard({ items, statuses, onItemClick, clientNameMap }: KanbanBoardProps) {
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());

  const toggleClient = (key: string) => {
    setCollapsedClients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group items by status
  const columns = useMemo(() => {
    return statuses.map(status => {
      const statusItems = items.filter(i => i.status === status.label);
      // Within each status, group by client
      const clientGroups = new Map<string, { client_name: string; items: Item[] }>();
      statusItems.forEach(item => {
        const key = item.client_id;
        if (!clientGroups.has(key)) {
          clientGroups.set(key, { client_name: clientNameMap.get(item.client_id) || 'Unknown', items: [] });
        }
        clientGroups.get(key)!.items.push(item);
      });
      return {
        status,
        items: statusItems,
        clientGroups: Array.from(clientGroups.entries()),
        completed: statusItems.filter(i => i.status === 'Completed').length,
        total: statusItems.length,
      };
    }).filter(col => col.items.length > 0 || statuses.indexOf(col.status) < 7); // Show columns that have items or are common
  }, [items, statuses, clientNameMap]);

  const getStatusColor = (label: string) => {
    const found = statuses.find(s => s.label === label);
    return found?.color || statusColor(label);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {columns.map(col => {
        const color = getStatusColor(col.status.label);
        return (
          <div key={col.status.id} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.status.label}</span>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                {col.items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[200px]">
              {col.clientGroups.map(([clientId, group]) => {
                const clientKey = `${col.status.label}-${clientId}`;
                const isCollapsed = collapsedClients.has(clientKey);

                return (
                  <div key={clientId}>
                    {/* Client sub-header */}
                    {col.clientGroups.length > 1 && (
                      <button
                        onClick={() => toggleClient(clientKey)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50 rounded-md transition-colors mb-1 cursor-pointer"
                      >
                        <svg className={`w-2.5 h-2.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {group.client_name}
                        <span className="text-gray-400 font-normal">({group.items.length})</span>
                      </button>
                    )}

                    {/* Item cards */}
                    {!isCollapsed && group.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className="bg-white border border-gray-100 rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-[#4556e0] transition-colors">
                            {item.item}
                          </div>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ color: priorityColor(item.priority), backgroundColor: priorityColor(item.priority) + '15' }}
                          >
                            {item.priority}
                          </span>
                        </div>

                        {item.section && (
                          <div className="text-[10px] text-gray-400 mb-2 truncate">{item.section}</div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {item.owner && (
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center text-[8px] font-semibold text-gray-500">
                                  {item.owner.charAt(0)}
                                </div>
                                <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{item.owner}</span>
                              </div>
                            )}
                          </div>
                          {item.due_date && (
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className={`text-[10px] font-medium ${
                                (daysLeft(item.due_date) ?? 0) < 0 ? 'text-red-500' :
                                (daysLeft(item.due_date) ?? 999) <= 3 ? 'text-amber-500' : 'text-gray-400'
                              }`}>
                                {fmtDate(item.due_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {col.items.length === 0 && (
                <div className="border-2 border-dashed border-gray-100 rounded-lg py-8 text-center">
                  <p className="text-[11px] text-gray-300">No items</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
