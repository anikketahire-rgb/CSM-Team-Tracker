'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useData';
import { useAuthStore } from '@/stores/auth';
import { Modal, FormField, Input, Button } from '@/components/ui/Primitives';

export default function SettingsPage() {
  const { users, loading, addUser, updateUser } = useUsers();
  const profile = useAuthStore(s => s.profile);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'csm' as 'admin' | 'csm' });
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

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

  if (loading) return <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-gray-400 mt-1">Manage CSMs and roles</p>
        </div>
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
    </>
  );
}
