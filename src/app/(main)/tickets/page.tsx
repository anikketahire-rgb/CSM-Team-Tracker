'use client';

import { useState, useMemo } from 'react';
import { useClients, useTickets, useStatuses } from '@/hooks/useData';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { Modal, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { fmtDate, statusColor, priorityColor } from '@/lib/utils';
import { Ticket } from '@/lib/types';

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'];

export default function TicketsPage() {
  const { clients } = useClients();
  const { tickets, loading, addTicket, updateTicket, deleteTicket } = useTickets();
  const { statuses: ticketStatuses } = useStatuses('ticket');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: '', subject: '', description: '', reporter: '', priority: 'P2', status: 'Open', source: 'Manual' });
  const [saving, setSaving] = useState(false);

  const statusOptions = useMemo(() => ticketStatuses.map(s => s.label), [ticketStatuses]);

  const clientNameMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const clientsList = useMemo(() => [...new Set(tickets.map(t => clientNameMap.get(t.client_id) || ''))].filter(Boolean).sort(), [tickets, clientNameMap]);

  let allTickets = tickets.map(t => ({ ...t, client_name: clientNameMap.get(t.client_id) || '' }));
  if (clientFilter !== 'all') allTickets = allTickets.filter(t => t.client_name === clientFilter);
  if (statusFilter !== 'all') allTickets = allTickets.filter(t => t.status === statusFilter);
  if (priorityFilter !== 'all') allTickets = allTickets.filter(t => t.priority === priorityFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    allTickets = allTickets.filter(t => t.subject?.toLowerCase().includes(q) || t.client_name?.toLowerCase().includes(q) || t.reporter?.toLowerCase().includes(q));
  }

  const getStatusColor = (label: string) => {
    const found = ticketStatuses.find(s => s.label === label);
    return found?.color || statusColor(label);
  };

  const handleAdd = async () => {
    if (!form.subject.trim() || !form.client_id) return;
    setSaving(true);
    const { error } = await addTicket({ ...form });
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setForm({ client_id: '', subject: '', description: '', reporter: '', priority: 'P2', status: 'Open', source: 'Manual' });
    }
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    await updateTicket(id, { [field]: value });
    if (selectedTicket?.id === id) {
      setSelectedTicket(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tickets</h2>
          <p className="text-sm text-gray-400 mt-1">Support tickets across clients</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add ticket</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0] w-60" />
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All clients</option>
          {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          <option value="all">All statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#4556e0]">
          {['all',...PRIORITY_OPTIONS].map(p => <option key={p} value={p}>{p === 'all' ? 'All priorities' : p}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center ml-2">{allTickets.length} tickets</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {['Client', 'Subject', 'Reporter', 'Priority', 'Status', 'Source', 'Created', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTickets.map(t => (
              <tr
                key={t.id}
                className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => setSelectedTicket(t)}
              >
                <td className="px-4 py-3 text-[#4556e0] font-medium text-xs">{t.client_name}</td>
                <td className="px-4 py-3 text-xs font-medium max-w-[250px] truncate">{t.subject}</td>
                <td className="px-4 py-3 text-xs text-gray-500" onClick={e => e.stopPropagation()}>
                  <input
                    value={t.reporter || ''}
                    onChange={e => handleInlineUpdate(t.id, 'reporter', e.target.value)}
                    className="bg-transparent border-0 text-xs text-gray-500 outline-none w-full hover:bg-gray-50 rounded px-1 py-0.5"
                    placeholder="—"
                  />
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    value={t.priority}
                    onChange={e => handleInlineUpdate(t.id, 'priority', e.target.value)}
                    className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none rounded px-1 py-0.5 hover:bg-gray-50"
                    style={{ color: priorityColor(t.priority) }}
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    value={t.status}
                    onChange={e => handleInlineUpdate(t.id, 'status', e.target.value)}
                    className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none rounded px-1 py-0.5 hover:bg-gray-50"
                    style={{ color: getStatusColor(t.status) }}
                  >
                    {statusOptions.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{t.source || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(t.created_at)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => deleteTicket(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
            {allTickets.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No tickets found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Ticket Detail Slide Panel */}
      <SlidePanel open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Ticket Details" width="w-[500px]">
        {selectedTicket && (
          <div className="space-y-5">
            <div>
              <div className="text-xs text-gray-400 mb-1">Client</div>
              <div className="text-sm font-semibold text-[#4556e0]">{clientNameMap.get(selectedTicket.client_id) || ''}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Subject</div>
              <div className="text-sm font-semibold text-gray-800">{selectedTicket.subject}</div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</div>
              <textarea
                value={selectedTicket.description || ''}
                onChange={e => handleInlineUpdate(selectedTicket.id, 'description', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0] h-24 resize-none"
                placeholder="Add description..."
              />
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</div>
                  <select
                    value={selectedTicket.priority}
                    onChange={e => handleInlineUpdate(selectedTicket.id, 'priority', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                  <select
                    value={selectedTicket.status}
                    onChange={e => handleInlineUpdate(selectedTicket.id, 'status', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  >
                    {statusOptions.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Reporter</div>
                  <input
                    value={selectedTicket.reporter || ''}
                    onChange={e => handleInlineUpdate(selectedTicket.id, 'reporter', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Source</div>
                  <div className="text-sm text-gray-500 pt-2">{selectedTicket.source || '—'}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Created</div>
                  <div className="text-sm text-gray-500">{fmtDate(selectedTicket.created_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Updated</div>
                  <div className="text-sm text-gray-500">{fmtDate(selectedTicket.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Add Ticket Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add ticket" footer={
        <>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !form.subject.trim() || !form.client_id}>{saving ? 'Saving...' : 'Save'}</Button>
        </>
      }>
        <div className="space-y-4">
          <FormField label="Client *">
            <Select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Subject *"><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Ticket subject" /></FormField>
          <FormField label="Description"><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0] h-20 resize-none" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Reporter"><Input value={form.reporter} onChange={e => setForm({...form, reporter: e.target.value})} /></FormField>
            <FormField label="Source"><Select value={form.source} onChange={e => setForm({...form, source: e.target.value})}>{['Manual','Email','Chat','Phone'].map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Priority"><Select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>{PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}</Select></FormField>
            <FormField label="Status"><Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statusOptions.map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
        </div>
      </Modal>
    </>
  );
}
