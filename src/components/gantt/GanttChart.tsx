'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Item, CustomStatus } from '@/lib/types';
import { daysLeft, fmtDate, priorityColor, statusColor } from '@/lib/utils';

interface GanttChartProps {
  items: Item[];
  statuses: CustomStatus[];
  onItemClick: (item: Item) => void;
  clientNameMap: Map<string, string>;
}

type ZoomLevel = 'week' | 'month' | 'quarter';

const DAY_MS = 86400000;

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('en-US', { day: 'numeric' });
}

function formatMonthHeader(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatWeekHeader(d: Date): string {
  return `W${Math.ceil((d.getDate()) / 7)}`;
}

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = r.getDate() - day + (day === 0 ? -6 : 1);
  r.setDate(diff);
  return r;
}

export default function GanttChart({ items, statuses, onItemClick, clientNameMap }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{ item: Item; x: number; y: number } | null>(null);

  const toggleClient = (key: string) => {
    setCollapsedClients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Compute timeline bounds
  const timeline = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    let hasDates = false;

    items.forEach(item => {
      const start = parseDate(item.start_date);
      const due = parseDate(item.due_date || item.eta);
      if (start) { hasDates = true; if (start < minDate || !hasDates) minDate = start; }
      if (due) { hasDates = true; if (due > maxDate || !hasDates) maxDate = due; }
    });

    if (!hasDates) {
      minDate = new Date();
      maxDate = addDays(new Date(), 90);
    }

    // Pad the timeline
    minDate = addDays(startOfDay(minDate), -7);
    maxDate = addDays(startOfDay(maxDate), 14);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / DAY_MS);

    return { start: minDate, end: maxDate, totalDays };
  }, [items]);

  // Generate timeline columns based on zoom
  const timelineColumns = useMemo(() => {
    const cols: { date: Date; label: string; isMonthStart: boolean; isWeekStart: boolean }[] = [];
    let current = startOfDay(timeline.start);

    while (current <= timeline.end) {
      cols.push({
        date: new Date(current),
        label: formatDayHeader(current),
        isMonthStart: current.getDate() === 1,
        isWeekStart: current.getDay() === 1,
      });
      current = addDays(current, 1);
    }
    return cols;
  }, [timeline]);

  // Month headers for top row
  const monthHeaders = useMemo(() => {
    const months: { label: string; startIdx: number; count: number }[] = [];
    let currentMonth = '';
    let startIdx = 0;
    let count = 0;

    timelineColumns.forEach((col, idx) => {
      const monthKey = `${col.date.getFullYear()}-${col.date.getMonth()}`;
      if (monthKey !== currentMonth) {
        if (currentMonth) {
          months.push({ label: months.length > 0 ? formatMonthHeader(timelineColumns[startIdx].date) : '', startIdx, count });
        }
        currentMonth = monthKey;
        startIdx = idx;
        count = 1;
      } else {
        count++;
      }
    });
    if (count > 0) {
      months.push({ label: formatMonthHeader(timelineColumns[startIdx].date), startIdx, count });
    }
    return months;
  }, [timelineColumns]);

  // Day column width based on zoom
  const dayWidth = zoom === 'week' ? 40 : zoom === 'month' ? 20 : 8;

  // Today marker position
  const todayPosition = useMemo(() => {
    const today = startOfDay(new Date());
    const diffDays = (today.getTime() - timeline.start.getTime()) / DAY_MS;
    return diffDays * dayWidth;
  }, [timeline, dayWidth]);

  // Group items by client
  const clientGroups = useMemo(() => {
    const map = new Map<string, { client_name: string; sections: Map<string, Item[]> }>();
    items.forEach(item => {
      const key = item.client_id;
      if (!map.has(key)) {
        map.set(key, { client_name: clientNameMap.get(item.client_id) || 'Unknown', sections: new Map() });
      }
      const client = map.get(key)!;
      const sec = item.section || 'General';
      if (!client.sections.has(sec)) client.sections.set(sec, []);
      client.sections.get(sec)!.push(item);
    });
    return Array.from(map.entries());
  }, [items, clientNameMap]);

  const getStatusColor = (label: string) => {
    const found = statuses.find(s => s.label === label);
    return found?.color || statusColor(label);
  };

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const todayOffset = todayPosition - container.clientWidth / 3;
      container.scrollLeft = Math.max(0, todayOffset);
    }
  }, [todayPosition]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Zoom controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Zoom:</span>
          {(['week', 'month', 'quarter'] as ZoomLevel[]).map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                zoom === z ? 'bg-[#4556e0] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-400 rounded" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-amber-400 rounded" />
            <span>Overdue</span>
          </div>
        </div>
      </div>

      {/* Gantt body */}
      <div className="flex overflow-hidden">
        {/* Left: item labels */}
        <div className="flex-shrink-0 w-56 border-r border-gray-100">
          {/* Month header spacer */}
          <div className="h-7 bg-gray-50/80 border-b border-gray-100" />
          {/* Day header spacer */}
          <div className="h-8 bg-gray-50/50 border-b border-gray-100 flex items-center px-3">
            <span className="text-[10px] font-semibold text-gray-400 uppercase">Items</span>
          </div>

          {/* Client/section/item labels */}
          <div className="max-h-[600px] overflow-y-auto">
            {clientGroups.map(([clientId, clientData]) => {
              const clientKey = `gantt-${clientId}`;
              const isCollapsed = collapsedClients.has(clientKey);
              const allClientItems = Array.from(clientData.sections.values()).flat();

              return (
                <div key={clientId}>
                  {/* Client header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50/30 border-b border-gray-50 cursor-pointer hover:bg-blue-50/50 transition-colors"
                    onClick={() => toggleClient(clientKey)}
                  >
                    <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-[11px] font-bold text-[#4556e0] uppercase tracking-wide truncate">
                      {clientData.client_name}
                    </span>
                    <span className="text-[10px] text-gray-400">({allClientItems.length})</span>
                  </div>

                  {/* Sections and items */}
                  {!isCollapsed && Array.from(clientData.sections.entries()).map(([sectionName, sectionItems]) => (
                    <div key={sectionName}>
                      {/* Section label */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 border-b border-gray-50 pl-6">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{sectionName}</span>
                        <span className="text-[10px] text-gray-400">({sectionItems.length})</span>
                      </div>

                      {/* Item rows */}
                      {sectionItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 hover:bg-blue-50/20 cursor-pointer transition-colors h-9"
                          onClick={() => onItemClick(item)}
                        >
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(item.status) }} />
                          <span className="text-[11px] text-gray-700 truncate">{item.item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            {clientGroups.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-400 text-sm">No items to display</div>
            )}
          </div>
        </div>

        {/* Right: timeline */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ minWidth: 0 }}
        >
          <div style={{ width: timelineColumns.length * dayWidth }}>
            {/* Month header row */}
            <div className="h-7 bg-gray-50/80 border-b border-gray-100 flex">
              {monthHeaders.map((month, idx) => (
                <div
                  key={idx}
                  className="border-r border-gray-100 flex items-center px-2"
                  style={{ width: month.count * dayWidth }}
                >
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Day header row */}
            <div className="h-8 bg-gray-50/50 border-b border-gray-100 flex">
              {timelineColumns.map((col, idx) => (
                <div
                  key={idx}
                  className={`border-r border-gray-50 flex items-center justify-center ${
                    col.isWeekStart ? 'border-l-gray-200' : ''
                  }`}
                  style={{ width: dayWidth }}
                >
                  {dayWidth >= 16 && (
                    <span className={`text-[8px] ${col.date.getDay() === 0 || col.date.getDay() === 6 ? 'text-gray-300' : 'text-gray-400'}`}>
                      {col.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline rows */}
            <div className="relative max-h-[600px] overflow-y-auto">
              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                style={{ left: todayPosition }}
              />

              {clientGroups.map(([clientId, clientData]) => {
                const clientKey = `gantt-${clientId}`;
                const isCollapsed = collapsedClients.has(clientKey);

                return (
                  <div key={clientId}>
                    {/* Client header row */}
                    <div className="h-9 bg-blue-50/20 border-b border-gray-50" />

                    {!isCollapsed && Array.from(clientData.sections.entries()).map(([sectionName, sectionItems]) => (
                      <div key={sectionName}>
                        {/* Section spacer row */}
                        <div className="h-6 bg-gray-50/30 border-b border-gray-50" />

                        {/* Item rows with bars */}
                        {sectionItems.map(item => {
                          const start = parseDate(item.start_date);
                          const due = parseDate(item.due_date || item.eta);

                          let barLeft = 0;
                          let barWidth = dayWidth * 3; // default width

                          if (start && due) {
                            const startDays = (start.getTime() - timeline.start.getTime()) / DAY_MS;
                            const duration = Math.max(1, (due.getTime() - start.getTime()) / DAY_MS);
                            barLeft = startDays * dayWidth;
                            barWidth = Math.max(dayWidth, duration * dayWidth);
                          } else if (due) {
                            const dueDays = (due.getTime() - timeline.start.getTime()) / DAY_MS;
                            barLeft = Math.max(0, (dueDays - 3) * dayWidth);
                            barWidth = dayWidth * 6;
                          } else if (start) {
                            const startDays = (start.getTime() - timeline.start.getTime()) / DAY_MS;
                            barLeft = startDays * dayWidth;
                            barWidth = dayWidth * 10;
                          }

                          const color = getStatusColor(item.status);
                          const isOverdue = due && due < new Date() && item.status !== 'Completed';

                          return (
                            <div
                              key={item.id}
                              className="h-9 border-b border-gray-50 relative cursor-pointer hover:bg-blue-50/10 transition-colors"
                              onClick={() => onItemClick(item)}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <div
                                className={`absolute top-2 h-5 rounded-sm flex items-center px-1.5 ${
                                  isOverdue ? 'bg-red-400' : ''
                                }`}
                                style={{
                                  left: barLeft,
                                  width: barWidth,
                                  backgroundColor: isOverdue ? undefined : color,
                                  opacity: 0.85,
                                }}
                              >
                                {barWidth > 60 && (
                                  <span className="text-[9px] font-medium text-white truncate">
                                    {item.item}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg px-3 py-2 shadow-xl pointer-events-none max-w-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-xs font-medium mb-1">{tooltip.item.item}</div>
          <div className="flex items-center gap-2 text-[10px] text-gray-300">
            <span>{tooltip.item.client_name}</span>
            <span>·</span>
            <span style={{ color: priorityColor(tooltip.item.priority) }}>{tooltip.item.priority}</span>
            <span>·</span>
            <span>{tooltip.item.status}</span>
          </div>
          {(tooltip.item.start_date || tooltip.item.due_date) && (
            <div className="text-[10px] text-gray-400 mt-1">
              {tooltip.item.start_date && <span>{fmtDate(tooltip.item.start_date)}</span>}
              {tooltip.item.start_date && tooltip.item.due_date && <span> → </span>}
              {tooltip.item.due_date && <span>{fmtDate(tooltip.item.due_date || tooltip.item.eta)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
