'use client';

import { useState, useMemo } from 'react';
import { useClients, useItems } from '@/hooks/useData';
import { StatusBadge, PriorityBadge, DaysLeftBadge } from '@/components/ui/Badges';
import { Modal, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { daysLeft, fmtDate } from '@/lib/utils';

export default function ItemsPage() {
  const { clients } = useClients();
  const { items, loading, addItem, updateItem, deleteItem } = useItems();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: '', section: '', item: '', priority: 'P2', status: 'Not Started', owner: '', eta: '' });
  const [saving, setSaving] = useState(false);

  const clientNameMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  let allItems = items.map(i => ({ ...i, client_name: clientNameMap.get(i.client_id) || '' }));
  if (clientFilter !== 'all') allItems = allItems.filter(i => i.client_name === clientFilter);
  if (statusFilter !== 'all') allItems = allItems.filter(i => i.status === statusFilter);
  if (priorityFilter !== 'all') allItems = allItems.filter(i => i.priority === priorityFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    allItems = allItems.filter(i => i.item?.toLowerCase().includes(q) || i.section?.toLowerCase().includes(q) || i.client_name?.toLowerCase().includes(q));
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

  const handleQuickStatus = async (id: string, status: string) => {
    await updateItem(id, { status });
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;

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
          {[...new Set(items.map(i => clientNameMap.get(i.client_id) || ''))].filter(Boolean).sort().map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          {['all','Not Started','In Progress','Delayed','Completed','Pending Client','Blocked','On Hold'].map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          {['all','P0','P1','P2','P3'].map(p => <option key={p} value={p}>{p === 'all' ? 'All priorities' : p}</option>)}
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
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-[#4556e0] font-medium text-xs">{item.client_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{item.section}</td>
                  <td className="px-4 py-3 text-xs font-medium max-w-[200px] truncate">{item.item}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={item.priority} /></td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => handleQuickStatus(item.id, e.target.value)}
                      className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none"
                      style={{ color: item.status === 'Completed' ? '#12a06a' : item.status === 'Blocked' ? '#d03d3b' : '#4556e0' }}
                    >
                      {['Not Started','In Progress','Delayed','Completed','Pending Client','Blocked','On Hold'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.owner || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(item.eta)}</td>
                  <td className="px-4 py-3"><DaysLeftBadge days={days} /></td>
                </tr>
              );
            })}
            {allItems.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No items found</td></tr>}
          </tbody>
        </table>
      </div>

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
            <FormField label="Priority"><Select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>{['P0','P1','P2','P3'].map(p => <option key={p}>{p}</option>)}</Select></FormField>
            <FormField label="Status"><Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Not Started','In Progress','Delayed','Completed','Pending Client','Blocked','On Hold'].map(s => <option key={s}>{s}</option>)}</Select></FormField>
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
