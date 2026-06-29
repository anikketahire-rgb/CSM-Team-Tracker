'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, FormField, Input, Select, Button } from '@/components/ui/Primitives';
import { useItemUpdates, useClients } from '@/hooks/useData';
import { useAuthStore } from '@/stores/auth';
import { daysLeft, fmtDate } from '@/lib/utils';
import { Item, Client } from '@/lib/types';

const UPDATE_TYPES = [
  { value: 'Status Update', color: '#2979c2' },
  { value: 'Blocker', color: '#d03d3b' },
  { value: 'Decision Needed', color: '#c47c17' },
  { value: 'Completed', color: '#12a06a' },
  { value: 'Note', color: '#6b7280' },
];

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'];

interface ItemDetailPanelProps {
  item: Item & { client_name?: string };
  onUpdate: (id: string, field: string, value: string) => Promise<void>;
  statusOptions: string[];
  getStatusColor: (status: string) => string;
}

function formatDateColumn(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export default function ItemDetailPanel({ item, onUpdate, statusOptions, getStatusColor }: ItemDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const { updates, loading: updatesLoading, addUpdate, updateUpdate, deleteUpdate } = useItemUpdates(item.id);
  const { clients } = useClients();
  const profile = useAuthStore(s => s.profile);

  const client = clients.find(c => c.id === item.client_id);

  // Comment form state
  const [commentType, setCommentType] = useState('Status Update');
  const [commentContent, setCommentContent] = useState('');
  const [commentDate, setCommentDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingComment, setSavingComment] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filterType, setFilterType] = useState('all');

  const handleAddComment = async () => {
    if (!commentContent.trim()) return;
    setSavingComment(true);
    await addUpdate({
      item_id: item.id,
      update_type: commentType,
      content: commentContent.trim(),
      update_date: commentDate,
      author: profile?.name || 'Unknown',
    });

    // Sync to Google Sheet if client has sheet configured
    if (client?.sheet_id && client?.apps_script_url) {
      try {
        const dateCol = formatDateColumn(commentDate);
        const commentText = `[${commentType}] ${commentContent.trim()}`;
        await fetch('/api/sync-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: client.id,
            sheet_id: client.sheet_id,
            tab_name: client.tab_name || 'Implementation Tracker',
            apps_script_url: client.apps_script_url,
            item_number: item.row_index || 0,
            date_column: dateCol,
            value: commentText,
          }),
        });
      } catch (e) {
        console.error('Failed to sync comment to sheet:', e);
      }
    }

    setCommentContent('');
    setSavingComment(false);
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await updateUpdate(id, { content: editContent.trim() });
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    await deleteUpdate(id);
  };

  const filteredUpdates = filterType === 'all' ? updates : updates.filter(u => u.update_type === filterType);

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'background', label: 'Background' },
    { key: 'comments', label: `Comments (${updates.length})` },
  ];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ===== DETAILS TAB ===== */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Client</div>
            <div className="text-sm font-semibold text-[#4556e0]">{item.client_name || '—'}</div>
          </div>

          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Item Name</div>
            <div className="text-sm font-semibold text-gray-800">{item.item}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Section">
              <input
                value={item.section || ''}
                onChange={e => onUpdate(item.id, 'section', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
              />
            </FormField>
            <FormField label="Owner">
              <input
                value={item.owner || ''}
                onChange={e => onUpdate(item.id, 'owner', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Priority">
              <select
                value={item.priority}
                onChange={e => onUpdate(item.id, 'priority', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
              >
                {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                value={item.status}
                onChange={e => onUpdate(item.id, 'status', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
              >
                {statusOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <input
                type="date"
                value={item.start_date || ''}
                onChange={e => onUpdate(item.id, 'start_date', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
              />
            </FormField>
            <FormField label="Due Date">
              <input
                type="date"
                value={item.due_date || ''}
                onChange={e => onUpdate(item.id, 'due_date', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0]"
              />
            </FormField>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Days Left</div>
            <div className={`text-sm font-semibold ${(daysLeft(item.due_date || item.eta) ?? 0) < 0 ? 'text-red-600' : (daysLeft(item.due_date || item.eta) ?? 999) <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
              {daysLeft(item.due_date || item.eta) !== null ? `${daysLeft(item.due_date || item.eta)}d` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* ===== BACKGROUND TAB ===== */}
      {activeTab === 'background' && (
        <div className="space-y-4">
          <FormField label="Background / Context">
            <textarea
              value={(item as any).background || ''}
              onChange={e => onUpdate(item.id, 'background', e.target.value)}
              rows={8}
              placeholder="Add context, notes, or background information about this item..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0] resize-none"
            />
          </FormField>
        </div>
      )}

      {/* ===== COMMENTS TAB ===== */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {/* Add comment form */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Update</h4>
            <div className="grid grid-cols-[140px_1fr] gap-2 mb-2">
              <Select value={commentType} onChange={e => setCommentType(e.target.value)}>
                {UPDATE_TYPES.map(t => <option key={t.value}>{t.value}</option>)}
              </Select>
              <Input type="date" value={commentDate} onChange={e => setCommentDate(e.target.value)} />
            </div>
            <textarea
              value={commentContent}
              onChange={e => setCommentContent(e.target.value)}
              rows={3}
              placeholder="Write your update..."
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4556e0] resize-none mb-2"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400">By: {profile?.name || 'Unknown'}</span>
              <Button onClick={handleAddComment} disabled={savingComment || !commentContent.trim()}>
                {savingComment ? 'Saving...' : 'Add Update'}
              </Button>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Filter:</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {UPDATE_TYPES.map(t => <option key={t.value}>{t.value}</option>)}
            </select>
          </div>

          {/* Comments list */}
          {updatesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : filteredUpdates.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No updates yet. Add the first one above.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredUpdates.map(update => {
                const typeInfo = UPDATE_TYPES.find(t => t.value === update.update_type) || UPDATE_TYPES[4];
                const isEditing = editingId === update.id;

                return (
                  <div key={update.id} className="bg-white border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: typeInfo.color + '18', color: typeInfo.color }}
                        >
                          {update.update_type}
                        </span>
                        <span className="text-[10px] text-gray-400">{fmtDate(update.update_date)}</span>
                        {update.source === 'sheet' && (
                          <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">from Sheet</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(update.id); setEditContent(update.content); }}
                          className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(update.id)}
                          className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4556e0] resize-none mb-2"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleEdit(update.id)} className="text-xs py-1 px-3">Save</Button>
                          <Button variant="secondary" onClick={() => setEditingId(null)} className="text-xs py-1 px-3">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{update.content}</p>
                    )}
                    <div className="text-[10px] text-gray-300 mt-1">By: {update.author || 'Unknown'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
