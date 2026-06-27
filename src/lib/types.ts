export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'csm';
  created_at: string;
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
  sync_enabled: boolean;
  last_synced_at: string;
  share_token: string;
  created_at: string;
}

export interface Item {
  id: string;
  client_id: string;
  client_name?: string;
  section: string;
  item: string;
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

export interface DashboardData {
  clients: Client[];
  items: Item[];
  tickets: Ticket[];
  activityLog: ActivityLog[];
}
