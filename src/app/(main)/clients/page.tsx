'use client';

import { useState } from 'react';
import { useClients, useItems, useTickets } from '@/hooks/useData';
import { SlidePanel, DetailField } from '@/components/ui/SlidePanel';
import { Modal, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { fmtACV, fmtDate, daysLeft } from '@/lib/utils';
import { Client } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';

const HEALTH_OPTIONS = ['Green', 'Amber', 'Red'];
const PHASE_OPTIONS = ['Implementation', 'Live', 'Onboarding', 'Churned'];
const REGION_OPTIONS = ['', 'MENA', 'SA', 'EU', 'UK', 'US', 'NG', 'APAC'];
const RENEWAL_STATUS_OPTIONS = ['New Account 1st Year', 'Renewed', 'At Risk', 'Lost', 'Expansion', 'In Progress'];

function healthColor(h: string) { return h === 'Green' ? '#12a06a' : h === 'Amber' ? '#c47c17' : '#d03d3b'; }

export default function ClientsPage() {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const { items } = useItems();
  const { tickets } = useTickets();
  const profile = useAuthStore(s => s.profile);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', csm_name: '', region: '', industry: '', phase: 'Implementation', health: 'Green', acv: '', renewal_date: '', renewal_status: 'New Account 1st Year', email: '', owners: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await addClient({
      name: form.name.trim(), csm_name: form.csm_name || profile?.name || '',
      region: form.region, industry: form.industry, phase: form.phase,
      health: form.health as 'Green' | 'Amber' | 'Red', acv: Number(form.acv) || 0,
      renewal_date: form.renewal_date, renewal_status: form.renewal_status,
      email: form.email, owners: form.owners.split(',').map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setForm({ name: '', csm_name: '', region: '', industry: '', phase: 'Implementation', health: 'Green', acv: '', renewal_date: '', renewal_status: 'New Account 1st Year', email: '', owners: '' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the tracker?`)) return;
    await deleteClient(id);
    if (selectedClient?.id === id) setSelectedClient(null);
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    await updateClient(id, { [field]: value } as Partial<Client>);
    if (selectedClient?.id === id) {
      setSelectedClient(prev => prev ? { ...prev, [field]: value } as Client : null);
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;

  const selectedItems = selectedClient ? items.filter(i => i.client_id === selectedClient.id) : [];
  const selectedTickets = selectedClient ? tickets.filter(t => t.client_id === selectedClient.id) : [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-gray-400 mt-1">All client engagements</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add client</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{clients.length} client{clients.length !== 1 ? 's' : ''}</h3>
          <span className="text-xs text-gray-400">Total ACV: {fmtACV(clients.reduce((s, c) => s + (c.acv || 0), 0))}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {['Client', 'CSM', 'Region', 'Health', 'Phase', 'ACV', 'Renewal', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr
                key={c.id}
                className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => setSelectedClient(c)}
              >
                <td className="px-4 py-3 font-medium text-[#4556e0]">{c.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500" onClick={e => e.stopPropagation()}>
                  <input
                    value={c.csm_name || ''}
                    onChange={e => handleInlineUpdate(c.id, 'csm_name', e.target.value)}
                    className="bg-transparent border-0 text-xs text-gray-500 outline-none w-full hover:bg-gray-50 rounded px-1 py-0.5"
                  />
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    value={c.region || ''}
                    onChange={e => handleInlineUpdate(c.id, 'region', e.target.value)}
                    className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-medium border-0 outline-none cursor-pointer"
                  >
                    {REGION_OPTIONS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    value={c.health}
                    onChange={e => handleInlineUpdate(c.id, 'health', e.target.value)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border-0 outline-none cursor-pointer"
                    style={{ backgroundColor: healthColor(c.health) + '18', color: healthColor(c.health) }}
                  >
                    {HEALTH_OPTIONS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    value={c.phase || 'Implementation'}
                    onChange={e => handleInlineUpdate(c.id, 'phase', e.target.value)}
                    className="bg-[#4556e0]/10 text-[#4556e0] px-2 py-0.5 rounded text-[11px] font-medium border-0 outline-none cursor-pointer"
                  >
                    {PHASE_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-green-600 font-mono text-xs">{fmtACV(c.acv)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.renewal_date)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    value={c.renewal_status || 'New Account 1st Year'}
                    onChange={e => handleInlineUpdate(c.id, 'renewal_status', e.target.value)}
                    className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[11px] font-medium border-0 outline-none cursor-pointer"
                  >
                    {RENEWAL_STATUS_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-gray-300 hover:text-red-500 transition-colors" title="Remove">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">No clients yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Client Detail Slide Panel */}
      <SlidePanel open={!!selectedClient} onClose={() => setSelectedClient(null)} title={selectedClient?.name || 'Client Details'} width="w-[520px]">
        {selectedClient && (
          <div className="space-y-5">
            {/* Health badge */}
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: healthColor(selectedClient.health) + '18', color: healthColor(selectedClient.health) }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: healthColor(selectedClient.health) }} />
                {selectedClient.health} Health
              </span>
              <span className="bg-[#4556e0]/10 text-[#4556e0] px-3 py-1 rounded-full text-xs font-semibold">{selectedClient.phase}</span>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">CSM</div>
                <input
                  value={selectedClient.csm_name || ''}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'csm_name', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Region</div>
                <select
                  value={selectedClient.region || ''}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'region', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                >
                  {REGION_OPTIONS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Industry</div>
                <input
                  value={selectedClient.industry || ''}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'industry', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Health</div>
                <select
                  value={selectedClient.health}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'health', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                >
                  {HEALTH_OPTIONS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">ACV (USD)</div>
                <input
                  type="number"
                  value={selectedClient.acv || ''}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'acv', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Renewal Date</div>
                <div className="text-sm text-gray-700 pt-2">{fmtDate(selectedClient.renewal_date)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Phase</div>
                <select
                  value={selectedClient.phase || 'Implementation'}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'phase', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                >
                  {PHASE_OPTIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Renewal Status</div>
                <select
                  value={selectedClient.renewal_status || 'New Account 1st Year'}
                  onChange={e => handleInlineUpdate(selectedClient.id, 'renewal_status', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
                >
                  {RENEWAL_STATUS_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</div>
              <div className="text-sm text-gray-500">{selectedClient.email || '—'}</div>
            </div>

            {/* Items summary */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold mb-3">Items ({selectedItems.length})</h4>
              {selectedItems.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedItems.map(item => {
                    const d = daysLeft(item.eta);
                    return (
                      <div key={item.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{item.item}</div>
                          <div className="text-[10px] text-gray-400">{item.section}</div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: (item.status === 'Completed' ? '#12a06a' : item.status === 'Blocked' ? '#d03d3b' : '#2979c2') + '18', color: item.status === 'Completed' ? '#12a06a' : item.status === 'Blocked' ? '#d03d3b' : '#2979c2' }}>
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No items for this client</p>
              )}
            </div>

            {/* Tickets summary */}
            {selectedTickets.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold mb-3">Tickets ({selectedTickets.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedTickets.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate">{t.subject}</div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: (t.status === 'Open' ? '#c47c17' : t.status === 'In Progress' ? '#2979c2' : '#12a06a') + '18', color: t.status === 'Open' ? '#c47c17' : t.status === 'In Progress' ? '#2979c2' : '#12a06a' }}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Add Client Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add client" footer={
        <>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !form.name.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
        </>
      }>
        <div className="space-y-4">
          <FormField label="Client name *"><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Acme Corp" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="CSM"><Input value={form.csm_name} onChange={e => setForm({...form, csm_name: e.target.value})} /></FormField>
            <FormField label="Region"><Select value={form.region} onChange={e => setForm({...form, region: e.target.value})}>{REGION_OPTIONS.map(r => <option key={r} value={r}>{r || '—'}</option>)}</Select></FormField>
          </div>
          <FormField label="Industry"><Input value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} placeholder="e.g. Banking" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phase"><Select value={form.phase} onChange={e => setForm({...form, phase: e.target.value})}>{PHASE_OPTIONS.map(p => <option key={p}>{p}</option>)}</Select></FormField>
            <FormField label="Health"><Select value={form.health} onChange={e => setForm({...form, health: e.target.value})}>{HEALTH_OPTIONS.map(h => <option key={h}>{h}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="ACV (USD)"><Input type="number" value={form.acv} onChange={e => setForm({...form, acv: e.target.value})} /></FormField>
            <FormField label="Renewal date"><Input type="date" value={form.renewal_date} onChange={e => setForm({...form, renewal_date: e.target.value})} /></FormField>
          </div>
          <FormField label="Client email"><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="client@company.com" /></FormField>
          <FormField label="Point of contacts"><Input value={form.owners} onChange={e => setForm({...form, owners: e.target.value})} placeholder="Comma-separated names" /></FormField>
        </div>
      </Modal>
    </>
  );
}
