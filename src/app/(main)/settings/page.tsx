'use client';

import { useState } from 'react';
import { useUsers, useClients, useStatuses } from '@/hooks/useData';
import { useAuthStore } from '@/stores/auth';
import { Modal, FormField, Input, Button } from '@/components/ui/Primitives';

export default function SettingsPage() {
  const { users, loading, addUser, updateUser } = useUsers();
  const { clients, regenerateShareToken } = useClients();
  const { statuses, addStatus, updateStatus, deleteStatus } = useStatuses();
  const profile = useAuthStore(s => s.profile);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'csm' as 'admin' | 'csm' });
  const [saving, setSaving] = useState(false);

  // Status management state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ category: 'item' as 'item' | 'ticket', label: '', color: '#7756c4' });
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  // Tab for settings sections
  const [activeTab, setActiveTab] = useState<'team' | 'statuses' | 'sharing'>('team');

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Access denied. Admin only.</p>
      </div>
    );
  }

  const handleAddUser = async () => {
    if (!form.email.trim() || !form.name.trim()) return;
    setSaving(true);
    const { error } = await addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    });
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setForm({ name: '', email: '', role: 'csm' });
    }
  };

  const handleRoleChange = async (id: string, role: 'admin' | 'csm') => {
    await updateUser(id, { role });
  };

  const handleAddStatus = async () => {
    if (!statusForm.label.trim()) return;
    setStatusSaving(true);
    if (editingStatus) {
      await updateStatus(editingStatus, { label: statusForm.label.trim(), color: statusForm.color });
    } else {
      const maxOrder = statuses.filter(s => s.category === statusForm.category).length;
      await addStatus({ ...statusForm, label: statusForm.label.trim(), sort_order: maxOrder });
    }
    setStatusSaving(false);
    setShowStatusModal(false);
    setEditingStatus(null);
    setStatusForm({ category: 'item', label: '', color: '#7756c4' });
  };

  const handleEditStatus = (id: string) => {
    const s = statuses.find(st => st.id === id);
    if (s) {
      setEditingStatus(id);
      setStatusForm({ category: s.category, label: s.label, color: s.color });
      setShowStatusModal(true);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    if (confirm('Delete this status? Items using it will keep their current value.')) {
      await deleteStatus(id);
    }
  };

  const handleCopyShareLink = (token: string, clientName: string) => {
    const url = `${window.location.origin}/view/${encodeURIComponent(clientName)}?token=${token}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  const itemStatuses = statuses.filter(s => s.category === 'item');
  const ticketStatuses = statuses.filter(s => s.category === 'ticket');

  if (loading) return <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-gray-400 mt-1">Manage team, statuses, and sharing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'team' as const, label: 'Team Members' },
          { key: 'statuses' as const, label: 'Custom Statuses' },
          { key: 'sharing' as const, label: 'Client Sharing' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Team Members Tab */}
      {activeTab === 'team' && (
        <>
          <div className="flex items-center justify-end mb-4">
            <Button onClick={() => setShowModal(true)}>+ Add CSM</Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold">Team Members ({users.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Name', 'Email', 'Role', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-500">
                          {u.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'csm')}
                        disabled={u.id === profile?.id}
                        className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer outline-none disabled:opacity-50"
                        style={{ color: u.role === 'admin' ? '#4556e0' : '#12a06a' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="csm">CSM</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {u.id === profile?.id && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">You</span>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">No team members</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 mt-6 p-5">
            <h3 className="text-sm font-semibold mb-4">Role Permissions</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-[#4556e0] mb-2">Admin</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>View all clients and data</li>
                  <li>Manage team members and roles</li>
                  <li>Add/delete clients</li>
                  <li>Manage custom statuses</li>
                  <li>Full edit access</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-green-600 mb-2">CSM</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>View assigned clients only</li>
                  <li>Edit items and tickets</li>
                  <li>Add new items and tickets</li>
                  <li>View activity log</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Statuses Tab */}
      {activeTab === 'statuses' && (
        <>
          <div className="grid grid-cols-2 gap-6">
            {/* Item Statuses */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Item Statuses ({itemStatuses.length})</h3>
                <button
                  onClick={() => { setStatusForm({ category: 'item', label: '', color: '#7756c4' }); setEditingStatus(null); setShowStatusModal(true); }}
                  className="text-xs text-[#4556e0] font-medium hover:underline cursor-pointer"
                >
                  + Add status
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {itemStatuses.map(s => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditStatus(s.id)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer">Edit</button>
                      <button onClick={() => handleDeleteStatus(s.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 cursor-pointer">Delete</button>
                    </div>
                  </div>
                ))}
                {itemStatuses.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No custom statuses</div>}
              </div>
            </div>

            {/* Ticket Statuses */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Ticket Statuses ({ticketStatuses.length})</h3>
                <button
                  onClick={() => { setStatusForm({ category: 'ticket', label: '', color: '#2979c2' }); setEditingStatus(null); setShowStatusModal(true); }}
                  className="text-xs text-[#4556e0] font-medium hover:underline cursor-pointer"
                >
                  + Add status
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {ticketStatuses.map(s => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditStatus(s.id)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer">Edit</button>
                      <button onClick={() => handleDeleteStatus(s.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 cursor-pointer">Delete</button>
                    </div>
                  </div>
                ))}
                {ticketStatuses.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No custom statuses</div>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 mt-6 p-5">
            <h3 className="text-sm font-semibold mb-2">About Custom Statuses</h3>
            <p className="text-xs text-gray-500">
              Custom statuses are used across all items and tickets. Adding a new status makes it available in all dropdowns.
              Editing a status updates its display name and color. Deleting a status only removes it from the dropdown — items
              using that status will keep their current value.
            </p>
          </div>
        </>
      )}

      {/* Client Sharing Tab */}
      {activeTab === 'sharing' && (
        <>
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold">Client Share Links</h3>
              <p className="text-xs text-gray-400 mt-1">Generate public read-only links for clients to view their implementation status</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Client', 'CSM', 'Share Token', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-xs">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.csm_name || '—'}</td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                          {c.share_token || 'Not generated'}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {c.share_token && (
                            <button
                              onClick={() => handleCopyShareLink(c.share_token, c.name)}
                              className="text-xs text-[#4556e0] font-medium hover:underline cursor-pointer"
                            >
                              Copy link
                            </button>
                          )}
                          <button
                            onClick={() => regenerateShareToken(c.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            Regenerate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 mt-6 p-5">
            <h3 className="text-sm font-semibold mb-2">How Client Sharing Works</h3>
            <ul className="text-xs text-gray-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#4556e0] mt-0.5">1.</span>
                Each client gets a unique share token automatically
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4556e0] mt-0.5">2.</span>
                Copy the share link and send it to the client
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4556e0] mt-0.5">3.</span>
                The client sees a read-only view of their items, tickets, and progress — no login required
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4556e0] mt-0.5">4.</span>
                You can regenerate the token at any time to revoke access to the old link
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Add Team Member Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add team member" footer={
        <>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleAddUser} disabled={saving || !form.email.trim() || !form.name.trim()}>{saving ? 'Adding...' : 'Add member'}</Button>
        </>
      }>
        <div className="space-y-4">
          <FormField label="Name *"><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" /></FormField>
          <FormField label="Email *"><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="user@company.com" /></FormField>
          <FormField label="Role">
            <div className="flex gap-3">
              <button onClick={() => setForm({...form, role: 'csm'})} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.role === 'csm' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>CSM</button>
              <button onClick={() => setForm({...form, role: 'admin'})} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.role === 'admin' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>Admin</button>
            </div>
          </FormField>
          <p className="text-xs text-gray-400">Note: The user must also be registered in Supabase Auth with their email/password. This panel manages the profile and role — actual authentication is handled by Supabase.</p>
        </div>
      </Modal>

      {/* Add/Edit Status Modal */}
      <Modal open={showStatusModal} onClose={() => { setShowStatusModal(false); setEditingStatus(null); }} title={editingStatus ? 'Edit Status' : 'Add Status'} footer={
        <>
          <Button variant="secondary" onClick={() => { setShowStatusModal(false); setEditingStatus(null); }}>Cancel</Button>
          <Button onClick={handleAddStatus} disabled={statusSaving || !statusForm.label.trim()}>{statusSaving ? 'Saving...' : editingStatus ? 'Update' : 'Add'}</Button>
        </>
      }>
        <div className="space-y-4">
          <FormField label="Category">
            <div className="flex gap-3">
              <button
                onClick={() => !editingStatus && setStatusForm({...statusForm, category: 'item'})}
                disabled={!!editingStatus}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${statusForm.category === 'item' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'} ${editingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Item
              </button>
              <button
                onClick={() => !editingStatus && setStatusForm({...statusForm, category: 'ticket'})}
                disabled={!!editingStatus}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${statusForm.category === 'ticket' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'} ${editingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Ticket
              </button>
            </div>
          </FormField>
          <FormField label="Label *">
            <Input
              value={statusForm.label}
              onChange={e => setStatusForm({...statusForm, label: e.target.value})}
              placeholder="e.g. In Review"
            />
          </FormField>
          <FormField label="Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={statusForm.color}
                onChange={e => setStatusForm({...statusForm, color: e.target.value})}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <span className="text-xs text-gray-500 font-mono">{statusForm.color}</span>
            </div>
          </FormField>
        </div>
      </Modal>
    </>
  );
}
