'use client';

import { useState } from 'react';
import { useClients, useItems } from '@/hooks/useData';
import { Modal, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import ClientDetailModal from '@/components/clients/ClientDetailModal';
import { fmtACV } from '@/lib/utils';
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
  const profile = useAuthStore(s => s.profile);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', csm_name: '', region: '', industry: '', phase: 'Implementation', health: 'Green', acv: '', renewal_date: '', renewal_status: 'New Account 1st Year', email: '', owners: '' });
  const [saving, setSaving] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);

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
      setShowAddModal(false);
      setForm({ name: '', csm_name: '', region: '', industry: '', phase: 'Implementation', health: 'Green', acv: '', renewal_date: '', renewal_status: 'New Account 1st Year', email: '', owners: '' });
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive "${name}"? You can restore it later from Settings.`)) return;
    await updateClient(id, { archived: true } as Partial<Client>);
    if (selectedClient?.id === id) setSelectedClient(null);
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    await updateClient(id, { [field]: value } as Partial<Client>);
    if (selectedClient?.id === id) {
      setSelectedClient(prev => prev ? { ...prev, [field]: value } as Client : null);
    }
  };

  const handleSaveClient = async (id: string, updates: Partial<Client>) => {
    const result = await updateClient(id, updates);
    if (!result.error) {
      setSelectedClient(prev => prev ? { ...prev, ...updates } as Client : null);
    }
    return result;
  };

  const handleCreateSheet = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    if (!client.apps_script_url) { alert('Set the Apps Script URL in the client Settings tab first.'); return; }
    setSheetLoading(true);
    try {
      const res = await fetch('/api/create-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_name: client.name, csm_name: client.csm_name, apps_script_url: client.apps_script_url }),
      });
      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); return; }
      await updateClient(clientId, { sheet_id: data.sheetId, tab_name: 'Implementation Tracker' });
      setSelectedClient(prev => prev ? { ...prev, sheet_id: data.sheetId, tab_name: 'Implementation Tracker' } as Client : null);
      alert('Sheet created successfully!');
    } catch (e) { alert('Failed to create sheet'); }
    setSheetLoading(false);
  };

  const handleImportSheet = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client?.sheet_id) { alert('No sheet linked. Set a Sheet ID first.'); return; }
    if (!client.apps_script_url) { alert('Set the Apps Script URL in the client Settings tab first.'); return; }
    setSheetLoading(true);
    try {
      const res = await fetch('/api/import-from-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, sheet_id: client.sheet_id, tab_name: client.tab_name, apps_script_url: client.apps_script_url }),
      });
      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); return; }
      alert(`Imported ${data.itemsImported} items from sheet!`);
    } catch (e) { alert('Failed to import'); }
    setSheetLoading(false);
  };

  const handleSyncSheet = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client?.sheet_id) { alert('No sheet linked.'); return; }
    if (!client.apps_script_url) { alert('Set the Apps Script URL in the client Settings tab first.'); return; }
    setSheetLoading(true);
    try {
      const res = await fetch('/api/sync-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, sheet_id: client.sheet_id, tab_name: client.tab_name, apps_script_url: client.apps_script_url }),
      });
      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); return; }
      alert(`Synced ${data.itemsSynced} items to sheet!`);
    } catch (e) { alert('Failed to sync'); }
    setSheetLoading(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-gray-400 mt-1">All client engagements</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add client</Button>
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
                <td className="px-4 py-3 text-xs text-gray-500">{c.renewal_date || '—'}</td>
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
                  <div className="relative group">
                    <button className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100 cursor-pointer" title="Actions">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                    <div className="absolute right-0 top-8 z-20 hidden group-hover:block bg-white border border-gray-100 rounded-lg shadow-lg py-1 min-w-[160px]">
                      <button
                        onClick={() => setSelectedClient(c)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        View Details
                      </button>
                      {c.sheet_id && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${c.sheet_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Open Sheet
                        </a>
                      )}
                      {c.share_token && (
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/view/${encodeURIComponent(c.name)}?token=${c.share_token}`;
                            navigator.clipboard.writeText(url);
                            alert('Share link copied!');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Copy Share Link
                        </button>
                      )}
                      <hr className="border-gray-100 my-1" />
                      <button
                        onClick={() => handleArchive(c.id, c.name)}
                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 cursor-pointer"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">No clients yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Client Detail Modal */}
      <ClientDetailModal
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        items={items}
        onSave={handleSaveClient}
        onCreateSheet={handleCreateSheet}
        onImportSheet={handleImportSheet}
        onSyncSheet={handleSyncSheet}
        syncing={sheetLoading}
      />

      {/* Add Client Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add client" footer={
        <>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
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
