'use client';

import { useState, useMemo } from 'react';
import { useClients, useItems } from '@/hooks/useData';
import { SlidePanel, DetailField, InlineSelect } from '@/components/ui/SlidePanel';
import { Modal, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { daysLeft, fmtDate } from '@/lib/utils';
import { Item } from '@/lib/types';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Delayed', 'Completed', 'Pending Client', 'Blocked', 'On Hold'];
const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'];

function statusColor(s: string) {
  const map: Record<string, string> = { Completed: '#12a06a', 'In Progress': '#2979c2', Blocked: '#d03d3b', Delayed: '#d03d3b', 'Not Started': '#9499b8', 'Pending Client': '#7756c4', 'On Hold': '#c47c17' };
  return map[s] || '#7756c4';
}

function priorityColor(p: string) {
  const map: Record<string, string> = { P0: '#d03d3b', P1: '#c47c17', P2: '#7756c4', P3: '#12a06a' };
  return map[p] || '#7756c4';
}

export default function ItemsPage() {
  const { clients } = useClients();
  const { items, loading, addItem, updateItem } = useItems();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: '', section: '', item: '', priority: 'P2', status: 'Not Started', owner: '', eta: '' });
  const [saving, setSaving] = useState(false);

  const clientNameMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const clientsList = useMemo(() => [...new Set(items.map(i => clientNameMap.get(i.client_id) || ''))].filter(Boolean).sort(), [items, clientNameMap]);

  let allItems = items.map(i => ({ ...i, client_name: clientNameMap.get(i.client_id) || '' }));
  if (clientFilter !== 'all') allItems = allItems.filter(i => i.client_name === clientFilter);
  if (statusFilter !== 'all') allItems = allItems.filter(i => i.status === statusFilter);
  if (priorityFilter !== 'all') allItems = allItems.filter(i => i.priority === priorityFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    allItems = allItems.filter(i => i.item?.toLowerCase().includes(q) || i.section?.toLowerCase().includes(q) || i.client_name?.toLowerCase().includes(q) || i.owner?.toLowerCase().includes(q));
  }

  const handleAdd = async () => {
    if (!form.item.trim() || !form.client_id) return;
    setSaving(true);
    const { error } = await addItem({ ...form });
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setForm({ client_id: '', section: '', item: '', priority: 'P2', status: 'Not Started', owner: '', eta: '' });
    }
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    await updateItem(id, { [field]: value });
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, [field]: value } : null);
    }
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
        <Button onClick={() => setShowModal(true)}>+ Add item</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0] w-60" />
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All clients</option>
          {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          {['all',...STATUS_OPTIONS].map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          {['all',...PRIORITY_OPTIONS].map(p => <option key={p} value={p}>{p === 'all' ? 'All priorities' : p}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center ml-2">{allItems.length} items</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {['Client', 'Section', 'Item', 'Priority', 'Status', 'Owner', 'ETA', 'Days Left'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allItems.map(item => {
              const days = daysLeft(item.eta);
              return (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="px-4 py-3 text-[#4556e0] font-medium text-xs">{item.client_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{item.section}</td>
                  <td className="px-4 py-3 text-xs font-medium max-w-[200px] truncate">{item.item}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={item.priority}
                      onChange={e => handleInlineUpdate(item.id, 'priority', e.target.value)}
                      className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none rounded px-1 py-0.5 hover:bg-gray-50"
                      style={{ color: priorityColor(item.priority) }}
                    >
                      {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={item.status}
                      onChange={e => handleInlineUpdate(item.id, 'status', e.target.value)}
                      className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none rounded px-1 py-0.5 hover:bg-gray-50"
                      style={{ color: statusColor(item.status) }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500" onClick={e => e.stopPropagation()}>
                    <input
                      value={item.owner || ''}
                      onChange={e => handleInlineUpdate(item.id, 'owner', e.target.value)}
                      className="bg-transparent border-0 text-xs text-gray-500 outline-none w-full hover:bg-gray-50 rounded px-1 py-0.5"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(item.eta)}</td>
                  <td className="px-4 py-3">
                    {days !== null ? (
                      <span className={`text-xs font-semibold ${days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
            {allItems.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No items found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Slide-out Detail Panel */}
      <SlidePanel open={!!selectedItem} onClose={() => setSelectedItem(null)} title="Item Details" width="w-[500px]">
        {selected && (
          <div className="space-y-1">
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Client</div>
              <div className="text-sm font-semibold text-[#4556e0]">{selected.client_name}</div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Item Name</div>
              <div className="text-sm font-semibold text-gray-800">{selected.item}</div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Section</div>
                  <input
                    value={selected.section || ''}
                    onChange={e => handleInlineUpdate(selected.id, 'section', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Owner</div>
                  <input
                    value={selected.owner || ''}
                    onChange={e => handleInlineUpdate(selected.id, 'owner', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</div>
                  <select
                    value={selected.priority}
                    onChange={e => handleInlineUpdate(selected.id, 'priority', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                  <select
                    value={selected.status}
                    onChange={e => handleInlineUpdate(selected.id, 'status', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">ETA</div>
                  <div className="text-sm text-gray-700">{fmtDate(selected.eta)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Days Left</div>
                  <div className={`text-sm font-semibold ${daysLeft(selected.eta) !== null && daysLeft(selected.eta)! < 0 ? 'text-red-600' : daysLeft(selected.eta) !== null && daysLeft(selected.eta)! <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {daysLeft(selected.eta) !== null ? `${daysLeft(selected.eta)}d` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Update</div>
              <div className="text-sm text-gray-500">{selected.last_update_text || 'No updates yet'}</div>
            </div>

            {selected.last_update_date && (
              <div className="text-[10px] text-gray-300 mt-1">Updated: {fmtDate(selected.last_update_date)}</div>
            )}
          </div>
        )}
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
            <FormField label="Status"><Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Owner"><Input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} /></FormField>
            <FormField label="ETA"><Input type="date" value={form.eta} onChange={e => setForm({...form, eta: e.target.value})} /></FormField>
          </div>
        </div>
      </Modal>
    </>
  );
}
