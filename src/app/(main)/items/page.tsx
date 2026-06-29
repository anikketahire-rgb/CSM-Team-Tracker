'use client';

import { useState, useMemo } from 'react';
import { useClients, useItems, useUsers, useStatuses, useItemUpdates } from '@/hooks/useData';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { Modal, Tabs, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { daysLeft, fmtDate, statusColor, priorityColor } from '@/lib/utils';
import { Item } from '@/lib/types';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import GanttChart from '@/components/gantt/GanttChart';
import { useAuthStore } from '@/stores/auth';
import ItemDetailPanel from '@/components/items/ItemDetailPanel';

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'];
type ViewMode = 'list' | 'kanban' | 'gantt';

export default function ItemsPage() {
  const { clients } = useClients();
  const { users } = useUsers();
  const { items, loading, addItem, updateItem } = useItems();
  const { statuses: itemStatuses } = useStatuses('item');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [csmFilter, setCsmFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: '', section: '', item: '', priority: 'P2', status: 'Not Started', owner: '', start_date: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  // Expanded states for collapsible groups (list view)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const statusOptions = useMemo(() => itemStatuses.map(s => s.label), [itemStatuses]);

  const clientNameMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const clientCsmMap = useMemo(() => new Map(clients.map(c => [c.id, c.csm_name || ''])), [clients]);

  const csmList = useMemo(() => {
    return [...new Set(clients.map(c => c.csm_name).filter(Boolean))].sort();
  }, [clients]);

  const sectionList = useMemo(() => {
    return [...new Set(items.map(i => i.section).filter(Boolean))].sort();
  }, [items]);

  const clientsList = useMemo(() => {
    return [...new Set(items.map(i => clientNameMap.get(i.client_id) || ''))].filter(Boolean).sort();
  }, [items, clientNameMap]);

  // Filter items (shared across all views)
  let allItems = items.map(i => ({
    ...i,
    client_name: clientNameMap.get(i.client_id) || '',
    csm_name: clientCsmMap.get(i.client_id) || '',
  }));

  if (clientFilter !== 'all') allItems = allItems.filter(i => i.client_name === clientFilter);
  if (csmFilter !== 'all') allItems = allItems.filter(i => i.csm_name === csmFilter);
  if (sectionFilter !== 'all') allItems = allItems.filter(i => i.section === sectionFilter);
  if (statusFilter !== 'all') allItems = allItems.filter(i => i.status === statusFilter);
  if (priorityFilter !== 'all') allItems = allItems.filter(i => i.priority === priorityFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    allItems = allItems.filter(i =>
      i.item?.toLowerCase().includes(q) ||
      i.section?.toLowerCase().includes(q) ||
      i.client_name?.toLowerCase().includes(q) ||
      i.owner?.toLowerCase().includes(q) ||
      i.csm_name?.toLowerCase().includes(q)
    );
  }

  // Group by client, then by section (for list view)
  const grouped = useMemo(() => {
    const clientMap = new Map<string, { client_name: string; csm_name: string; sections: Map<string, Item[]> }>();
    allItems.forEach(item => {
      const key = item.client_id;
      if (!clientMap.has(key)) {
        clientMap.set(key, { client_name: item.client_name, csm_name: item.csm_name, sections: new Map() });
      }
      const client = clientMap.get(key)!;
      const sec = item.section || 'General';
      if (!client.sections.has(sec)) client.sections.set(sec, []);
      client.sections.get(sec)!.push(item);
    });
    return Array.from(clientMap.entries());
  }, [allItems]);

  const totalCompleted = allItems.filter(i => i.status === 'Completed').length;
  const overallPct = allItems.length > 0 ? Math.round((totalCompleted / allItems.length) * 100) : 0;

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!form.item.trim() || !form.client_id) return;
    setSaving(true);
    const { error } = await addItem({ ...form });
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setForm({ client_id: '', section: '', item: '', priority: 'P2', status: 'Not Started', owner: '', start_date: '', due_date: '' });
    }
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    await updateItem(id, { [field]: value });
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const getStatusColor = (label: string) => {
    const found = itemStatuses.find(s => s.label === label);
    return found?.color || statusColor(label);
  };

  if (loading) return <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;

  const selected = selectedItem ? { ...selectedItem, client_name: clientNameMap.get(selectedItem.client_id) || '' } : null;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Implementation Items</h2>
          <p className="text-sm text-gray-400 mt-1">All implementation steps across clients</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([
              { key: 'list' as const, label: 'List', icon: 'M4 6h16M4 12h16M4 18h16' },
              { key: 'kanban' as const, label: 'Kanban', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
              { key: 'gantt' as const, label: 'Gantt', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h10a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm0 8a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z' },
            ]).map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === v.key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={v.icon} />
                </svg>
                {v.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowModal(true)}>+ Add item</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search item, owner, background..."
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0] w-64"
        />
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All clients</option>
          {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={csmFilter} onChange={e => setCsmFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All CSMs</option>
          {csmList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All sections</option>
          {sectionList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Item count + progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-700">{allItems.length} items</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${overallPct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{totalCompleted}/{allItems.length} completed ({overallPct}%)</span>
          </div>
        </div>
      </div>

      {/* ===== LIST VIEW ===== */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_1.5fr_120px_100px_100px_100px_120px_120px_40px] gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
            {['Item', 'Background', 'Owner', 'Priority', 'Start Date', 'Due Date', 'Status', 'Last Update', ''].map(h => (
              <div key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          <div>
            {grouped.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-400 text-sm">No items found</div>
            )}

            {grouped.map(([clientId, clientData]) => {
              const clientExpanded = expandedClients.has(clientId);
              const clientItems = allItems.filter(i => i.client_id === clientId);
              const clientCompleted = clientItems.filter(i => i.status === 'Completed').length;
              const clientPct = clientItems.length > 0 ? Math.round((clientCompleted / clientItems.length) * 100) : 0;

              return (
                <div key={clientId}>
                  {/* Client header row */}
                  <div
                    className="grid grid-cols-[1fr_1.5fr_120px_100px_100px_100px_120px_120px_40px] gap-2 px-4 py-3 bg-blue-50/40 border-b border-gray-100 cursor-pointer hover:bg-blue-50/60 transition-colors"
                    onClick={() => toggleClient(clientId)}
                  >
                    <div className="col-span-9 flex items-center gap-2">
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${clientExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-xs font-bold text-[#4556e0] uppercase tracking-wide">{clientData.client_name}</span>
                      {clientData.csm_name && (
                        <span className="text-[10px] font-semibold bg-[#4556e0]/10 text-[#4556e0] px-2 py-0.5 rounded-full">
                          {clientData.csm_name.toUpperCase()}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 ml-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${clientPct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{clientCompleted}/{clientItems.length} ({clientPct}%)</span>
                      </div>
                    </div>
                  </div>

                  {clientExpanded && Array.from(clientData.sections.entries()).map(([sectionName, sectionItems]) => {
                    const sectionKey = `${clientId}-${sectionName}`;
                    const sectionExpanded = expandedSections.has(sectionKey);
                    const secCompleted = sectionItems.filter(i => i.status === 'Completed').length;
                    const secPct = sectionItems.length > 0 ? Math.round((secCompleted / sectionItems.length) * 100) : 0;

                    return (
                      <div key={sectionKey}>
                        <div
                          className="grid grid-cols-[1fr_1.5fr_120px_100px_100px_100px_120px_120px_40px] gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-50 cursor-pointer hover:bg-gray-100/60 transition-colors"
                          onClick={() => toggleSection(sectionKey)}
                        >
                          <div className="col-span-9 flex items-center gap-2 pl-5">
                            <svg className={`w-3 h-3 text-gray-400 transition-transform ${sectionExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{sectionName}</span>
                            <span className="text-[10px] text-gray-400">({sectionItems.length})</span>
                            <div className="flex items-center gap-1.5 ml-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${secPct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400">{secCompleted}/{sectionItems.length} ({secPct}%)</span>
                            </div>
                          </div>
                        </div>

                        {sectionExpanded && sectionItems.map(item => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[1fr_1.5fr_120px_100px_100px_100px_120px_120px_40px] gap-2 px-4 py-3 border-b border-gray-50 hover:bg-blue-50/20 cursor-pointer transition-colors items-center"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="text-xs font-medium text-gray-800 leading-relaxed line-clamp-2 pl-5">{item.item}</div>
                            <div className="text-xs text-gray-500 leading-relaxed line-clamp-3">{item.background || '—'}</div>
                            <div className="text-xs text-gray-500 truncate" onClick={e => e.stopPropagation()}>
                              <input
                                value={item.owner || ''}
                                onChange={e => handleInlineUpdate(item.id, 'owner', e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-500 outline-none w-full hover:bg-gray-50 rounded px-1 py-0.5"
                                placeholder="—"
                              />
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                              <select
                                value={item.priority}
                                onChange={e => handleInlineUpdate(item.id, 'priority', e.target.value)}
                                className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none rounded px-1 py-0.5 hover:bg-gray-50"
                                style={{ color: priorityColor(item.priority) }}
                              >
                                {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                              </select>
                            </div>
                            <div className="text-xs text-gray-500" onClick={e => e.stopPropagation()}>
                              <input
                                type="date"
                                value={item.start_date || ''}
                                onChange={e => handleInlineUpdate(item.id, 'start_date', e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-500 outline-none w-full hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer"
                              />
                            </div>
                            <div className="text-xs text-gray-500" onClick={e => e.stopPropagation()}>
                              <input
                                type="date"
                                value={item.due_date || ''}
                                onChange={e => handleInlineUpdate(item.id, 'due_date', e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-500 outline-none w-full hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer"
                              />
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                              <select
                                value={item.status}
                                onChange={e => handleInlineUpdate(item.id, 'status', e.target.value)}
                                className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none rounded px-1 py-0.5 hover:bg-gray-50"
                                style={{ color: getStatusColor(item.status) }}
                              >
                                {statusOptions.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {item.last_update_text || '—'}
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedItem(item); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== KANBAN VIEW ===== */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          items={allItems}
          statuses={itemStatuses}
          onItemClick={setSelectedItem}
          clientNameMap={clientNameMap}
        />
      )}

      {/* ===== GANTT VIEW ===== */}
      {viewMode === 'gantt' && (
        <GanttChart
          items={allItems}
          statuses={itemStatuses}
          onItemClick={setSelectedItem}
          clientNameMap={clientNameMap}
        />
      )}

      {/* Slide-out Detail Panel (shared across views) */}
      <SlidePanel open={!!selectedItem} onClose={() => setSelectedItem(null)} title="Item Details" width="w-[580px]">
        {selected && <ItemDetailPanel item={selected} onUpdate={handleInlineUpdate} statusOptions={statusOptions} getStatusColor={getStatusColor} />}
      </SlidePanel>

      {/* Add Item Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add item" footer={
        <>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !form.item.trim() || !form.client_id}>{saving ? 'Saving...' : 'Save'}</Button>
        </>
      }>
        <div className="space-y-4">
          <FormField label="Client *">
            <Select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Section"><Input value={form.section} onChange={e => setForm({...form, section: e.target.value})} placeholder="e.g. Account Setup" /></FormField>
          <FormField label="Item *"><Input value={form.item} onChange={e => setForm({...form, item: e.target.value})} placeholder="e.g. SSO Configuration" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Priority"><Select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>{PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}</Select></FormField>
            <FormField label="Status"><Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statusOptions.map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Owner"><Input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} /></FormField>
            <FormField label="Start Date"><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></FormField>
          </div>
          <FormField label="Due Date"><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></FormField>
        </div>
      </Modal>
    </>
  );
}
