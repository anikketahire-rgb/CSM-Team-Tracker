'use client';

import { useState } from 'react';
import { useClients } from '@/hooks/useData';
import { HealthBadge } from '@/components/ui/Badges';
import { Modal, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { fmtACV, fmtDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

export default function ClientsPage() {
  const { clients, loading, addClient, deleteClient } = useClients();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', csm_name: '', region: '', industry: '', phase: 'Implementation', health: 'Green', acv: '', renewal_date: '', renewal_status: 'New Account 1st Year', email: '', owners: '' });
  const [saving, setSaving] = useState(false);
  const profile = useAuthStore(s => s.profile);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await addClient({
      name: form.name.trim(),
      csm_name: form.csm_name || profile?.name || '',
      region: form.region,
      industry: form.industry,
      phase: form.phase,
      health: form.health as 'Green' | 'Amber' | 'Red',
      acv: Number(form.acv) || 0,
      renewal_date: form.renewal_date,
      renewal_status: form.renewal_status,
      email: form.email,
      owners: form.owners.split(',').map(s => s.trim()).filter(Boolean),
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
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;

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
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-[#4556e0]">{c.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.csm_name || '—'}</td>
                <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-medium">{c.region || '—'}</span></td>
                <td className="px-4 py-3"><HealthBadge health={c.health} /></td>
                <td className="px-4 py-3"><span className="bg-[#4556e0]/10 text-[#4556e0] px-2 py-0.5 rounded text-[11px] font-medium">{c.phase || '—'}</span></td>
                <td className="px-4 py-3 text-green-600 font-mono text-xs">{fmtACV(c.acv)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.renewal_date)}</td>
                <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[11px] font-medium">{c.renewal_status || '—'}</span></td>
                <td className="px-4 py-3">
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
            <FormField label="Region"><Select value={form.region} onChange={e => setForm({...form, region: e.target.value})}><option value="">—</option>{['MENA','SA','EU','UK','US','APAC'].map(r => <option key={r}>{r}</option>)}</Select></FormField>
          </div>
          <FormField label="Industry"><Input value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} placeholder="e.g. Banking" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phase"><Select value={form.phase} onChange={e => setForm({...form, phase: e.target.value})}>{['Implementation','Live','Onboarding','Churned'].map(p => <option key={p}>{p}</option>)}</Select></FormField>
            <FormField label="Health"><Select value={form.health} onChange={e => setForm({...form, health: e.target.value})}>{['Green','Amber','Red'].map(h => <option key={h}>{h}</option>)}</Select></FormField>
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
