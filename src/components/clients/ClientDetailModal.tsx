'use client';

import { useState, useMemo } from 'react';
import { Modal, Tabs, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { Client, Item, OwnerPoolEntry } from '@/lib/types';
import { fmtACV, fmtDate, daysLeft, statusColor, priorityColor } from '@/lib/utils';

interface ClientDetailModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  items: Item[];
  onSave: (id: string, updates: Partial<Client>) => Promise<{ error: any }>;
  onCreateSheet?: (clientId: string) => Promise<void>;
  onImportSheet?: (clientId: string) => Promise<void>;
  onSyncSheet?: (clientId: string) => Promise<void>;
  syncing?: boolean;
}

const HEALTH_OPTIONS = ['Green', 'Amber', 'Red'];
const PHASE_OPTIONS = ['Implementation', 'Live', 'Onboarding', 'Churned'];
const REGION_OPTIONS = ['', 'MENA', 'SA', 'EU', 'UK', 'US', 'NG', 'APAC'];
const RENEWAL_STATUS_OPTIONS = ['New Account 1st Year', 'Renewed', 'At Risk', 'Lost', 'Expansion', 'In Progress'];
const REPORT_FREQ_OPTIONS = ['Weekly', 'Bi-weekly', 'Monthly'];
const OWNER_ROLE_OPTIONS = ['Client', 'QuestionPro', 'Third Party'];

function healthColor(h: string) { return h === 'Green' ? '#12a06a' : h === 'Amber' ? '#c47c17' : '#d03d3b'; }

export default function ClientDetailModal({
  open, onClose, client, items, onSave, onCreateSheet, onImportSheet, onSyncSheet, syncing
}: ClientDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [form, setForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newOwner, setNewOwner] = useState<OwnerPoolEntry>({ name: '', role: 'Client', email: '' });
  const [editingOwnerIdx, setEditingOwnerIdx] = useState<number | null>(null);

  // Initialize form when client changes
  const editForm = useMemo(() => {
    if (!client) return {};
    return { ...client };
  }, [client]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    await onSave(client.id, form);
    setSaving(false);
    setForm({});
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const current = form.categories || client?.categories || [];
    handleChange('categories', [...current, newCategory.trim()]);
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    const current = form.categories || client?.categories || [];
    handleChange('categories', current.filter(c => c !== cat));
  };

  const handleAddOwner = () => {
    if (!newOwner.name.trim()) return;
    const current = form.owner_pool || client?.owner_pool || [];
    handleChange('owner_pool', [...current, { ...newOwner }]);
    setNewOwner({ name: '', role: 'Client', email: '' });
  };

  const handleRemoveOwner = (idx: number) => {
    const current = form.owner_pool || client?.owner_pool || [];
    handleChange('owner_pool', current.filter((_, i) => i !== idx));
  };

  const handleUpdateOwner = (idx: number, field: keyof OwnerPoolEntry, value: string) => {
    const current = [...(form.owner_pool || client?.owner_pool || [])];
    current[idx] = { ...current[idx], [field]: value };
    handleChange('owner_pool', current);
  };

  if (!client) return null;

  const currentForm = { ...editForm, ...form };
  const currentCategories = currentForm.categories || [];
  const currentOwnerPool = currentForm.owner_pool || [];
  const clientItems = items.filter(i => i.client_id === client.id);
  const completedItems = clientItems.filter(i => i.status === 'Completed').length;
  const blockedItems = clientItems.filter(i => i.status === 'Blocked').length;
  const overdueItems = clientItems.filter(i => {
    const d = daysLeft(i.due_date || i.eta);
    return d !== null && d < 0 && i.status !== 'Completed';
  }).length;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'owners', label: `Owners (${currentOwnerPool.length})` },
    { key: 'items', label: `Items (${clientItems.length})` },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <Modal open={open} onClose={onClose} title={client.name} width="max-w-[900px]">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Summary metrics */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Health', value: currentForm.health || 'Green', color: healthColor(currentForm.health || 'Green') },
              { label: 'Phase', value: currentForm.phase || 'Implementation', color: '#4556e0' },
              { label: 'Completed', value: `${completedItems}/${clientItems.length}`, color: '#12a06a' },
              { label: 'At Risk', value: blockedItems + overdueItems, color: blockedItems + overdueItems > 0 ? '#d03d3b' : '#12a06a' },
            ].map((m, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{m.label}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Main fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Client Name">
              <Input value={currentForm.name || ''} onChange={e => handleChange('name', e.target.value)} />
            </FormField>
            <FormField label="CSM">
              <Input value={currentForm.csm_name || ''} onChange={e => handleChange('csm_name', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Region">
              <Select value={currentForm.region || ''} onChange={e => handleChange('region', e.target.value)}>
                {REGION_OPTIONS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
              </Select>
            </FormField>
            <FormField label="Industry">
              <Input value={currentForm.industry || ''} onChange={e => handleChange('industry', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Health">
              <Select value={currentForm.health || 'Green'} onChange={e => handleChange('health', e.target.value)}>
                {HEALTH_OPTIONS.map(h => <option key={h}>{h}</option>)}
              </Select>
            </FormField>
            <FormField label="Phase">
              <Select value={currentForm.phase || 'Implementation'} onChange={e => handleChange('phase', e.target.value)}>
                {PHASE_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="ACV (USD)">
              <Input type="number" value={currentForm.acv || ''} onChange={e => handleChange('acv', Number(e.target.value))} />
            </FormField>
            <FormField label="Renewal Date">
              <Input type="date" value={currentForm.renewal_date || ''} onChange={e => handleChange('renewal_date', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Renewal Status">
              <Select value={currentForm.renewal_status || 'New Account 1st Year'} onChange={e => handleChange('renewal_status', e.target.value)}>
                {RENEWAL_STATUS_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </Select>
            </FormField>
            <FormField label="Report Frequency">
              <Select value={currentForm.report_frequency || 'Weekly'} onChange={e => handleChange('report_frequency', e.target.value)}>
                {REPORT_FREQ_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input type="email" value={currentForm.email || ''} onChange={e => handleChange('email', e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <Input value={currentForm.phone || ''} onChange={e => handleChange('phone', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Categories (Sections)">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 bg-[#4556e0]/10 text-[#4556e0] px-2 py-1 rounded-md text-xs font-medium">
                  {cat}
                  <button onClick={() => handleRemoveCategory(cat)} className="text-[#4556e0]/50 hover:text-[#4556e0] cursor-pointer">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Add category..." className="flex-1" />
              <Button variant="secondary" onClick={handleAddCategory} type="button">Add</Button>
            </div>
          </FormField>
        </div>
      )}

      {/* ===== OWNERS TAB ===== */}
      {activeTab === 'owners' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Owner</h4>
            <div className="grid grid-cols-[1fr_120px_1fr_auto] gap-2 items-end">
              <FormField label="Name">
                <Input value={newOwner.name} onChange={e => setNewOwner(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Wasiu" />
              </FormField>
              <FormField label="Role">
                <Select value={newOwner.role} onChange={e => setNewOwner(prev => ({ ...prev, role: e.target.value as any }))}>
                  {OWNER_ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </Select>
              </FormField>
              <FormField label="Email">
                <Input value={newOwner.email} onChange={e => setNewOwner(prev => ({ ...prev, email: e.target.value }))} placeholder="optional" />
              </FormField>
              <Button onClick={handleAddOwner} type="button" className="mb-0.5">Add</Button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Owners ({currentOwnerPool.length})</h4>
            {currentOwnerPool.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No owners added yet. Owners appear in the Owner dropdown when editing items.</p>
            ) : (
              <div className="space-y-1">
                {currentOwnerPool.map((owner, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-semibold text-gray-500">
                      {owner.name.charAt(0)}
                    </div>
                    {editingOwnerIdx === idx ? (
                      <>
                        <Input value={owner.name} onChange={e => handleUpdateOwner(idx, 'name', e.target.value)} className="flex-1" />
                        <Select value={owner.role} onChange={e => handleUpdateOwner(idx, 'role', e.target.value)} className="w-28">
                          {OWNER_ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                        </Select>
                        <Input value={owner.email} onChange={e => handleUpdateOwner(idx, 'email', e.target.value)} className="flex-1" placeholder="email" />
                        <button onClick={() => setEditingOwnerIdx(null)} className="text-xs text-[#4556e0] cursor-pointer">Done</button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700">{owner.name}</div>
                          {owner.email && <div className="text-[10px] text-gray-400">{owner.email}</div>}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          owner.role === 'Client' ? 'bg-blue-100 text-blue-700' :
                          owner.role === 'QuestionPro' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {owner.role}
                        </span>
                        <button onClick={() => setEditingOwnerIdx(idx)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Edit</button>
                        <button onClick={() => handleRemoveOwner(idx)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer">Remove</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ITEMS TAB ===== */}
      {activeTab === 'items' && (
        <div>
          {clientItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No items for this client yet.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Item', 'Section', 'Priority', 'Status', 'Owner', 'Due Date'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientItems.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-800 max-w-[200px] truncate">{item.item}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{item.section}</td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] font-semibold" style={{ color: priorityColor(item.priority) }}>{item.priority}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] font-semibold" style={{ color: statusColor(item.status) }}>{item.status}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[120px]">{item.owner || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(item.due_date || item.eta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Google Sheet</h4>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <FormField label="Sheet ID">
                <Input value={currentForm.sheet_id || ''} onChange={e => handleChange('sheet_id', e.target.value)} placeholder="Auto-filled after creating sheet" />
              </FormField>
              <FormField label="Tab Name">
                <Input value={currentForm.tab_name || 'Implementation Tracker'} onChange={e => handleChange('tab_name', e.target.value)} />
              </FormField>
            </div>

            <div className="flex gap-2 mb-3">
              {!currentForm.sheet_id && (
                <Button onClick={() => onCreateSheet?.(client.id)}>Create Sheet</Button>
              )}
              {currentForm.sheet_id && (
                <Button variant="secondary" onClick={() => onImportSheet?.(client.id)} disabled={syncing}>
                  {syncing ? 'Importing...' : 'Import from Sheet'}
                </Button>
              )}
              {currentForm.sheet_id && (
                <Button variant="secondary" onClick={() => onSyncSheet?.(client.id)} disabled={syncing}>
                  {syncing ? 'Syncing...' : 'Sync to Sheet'}
                </Button>
              )}
            </div>

            {currentForm.sheet_id && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${currentForm.sheet_id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#4556e0] hover:underline"
              >
                Open in Google Sheets ↗
              </a>
            )}

            {currentForm.sheet_last_synced_at && (
              <div className="text-[11px] text-gray-400 mt-2">
                Last synced: {fmtDate(currentForm.sheet_last_synced_at)}
              </div>
            )}
            {currentForm.sheet_sync_error && (
              <div className="text-[11px] text-red-500 mt-1">
                Last sync failed: {currentForm.sheet_sync_error}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <FormField label="Share Token">
              <div className="flex gap-2">
                <Input value={currentForm.share_token || ''} readOnly className="bg-gray-100" />
                <Button variant="secondary" onClick={() => {
                  const url = `${window.location.origin}/view/${encodeURIComponent(client.name)}?token=${currentForm.share_token}`;
                  navigator.clipboard.writeText(url);
                }}>Copy Link</Button>
              </div>
            </FormField>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </Modal>
  );
}
