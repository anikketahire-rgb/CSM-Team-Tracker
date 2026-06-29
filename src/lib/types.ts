export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'csm';
  created_at: string;
}

export interface OwnerPoolEntry {
  name: string;
  role: 'Client' | 'QuestionPro' | 'Third Party';
  email: string;
}

export interface Client {
  id: string;
  name: string;
  csm_id: string;
  csm_name?: string;
  region: string;
  industry: string;
  health: 'Green' | 'Amber' | 'Red';
  acv: number;
  renewal_date: string;
  renewal_status: string;
  phase: string;
  sheet_id: string;
  tab_name: string;
  email: string;
  owners: string[];
  owner_pool: OwnerPoolEntry[];
  categories: string[];
  report_frequency: string;
  phone: string;
  timezone: string;
  sync_enabled: boolean;
  last_synced_at: string;
  share_token: string;
  archived: boolean;
  sheet_last_synced_at: string;
  sheet_sync_error: string;
  created_at: string;
}

export interface Item {
  id: string;
  client_id: string;
  client_name?: string;
  section: string;
  item: string;
  background: string;
  priority: string;
  status: string;
  owner: string;
  eta: string;
  start_date: string;
  due_date: string;
  last_update_text: string;
  last_update_date: string;
  row_index: number;
  created_at: string;
}

export interface Ticket {
  id: string;
  client_id: string;
  client_name?: string;
  subject: string;
  description: string;
  reporter: string;
  priority: string;
  status: string;
  source: string;
  deadline: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  actor: string;
  type: string;
  client: string;
  message: string;
  created_at: string;
}

export interface CustomStatus {
  id: string;
  category: 'item' | 'ticket';
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface ItemUpdate {
  id: string;
  item_id: string;
  update_date: string;
  update_type: string;
  content: string;
  author: string;
  source: 'app' | 'sheet';
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  client_id: string;
  direction: 'push' | 'pull';
  status: 'success' | 'error';
  details: string;
  items_affected: number;
  created_at: string;
}

export interface DashboardData {
  clients: Client[];
  items: Item[];
  tickets: Ticket[];
  activityLog: ActivityLog[];
}
