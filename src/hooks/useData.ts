'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Item, Ticket, ActivityLog, User } from '@/lib/types';
import { User as SupaUser } from '@supabase/supabase-js';

export function useAuth() {
  const [supabaseUser, setSupabaseUser] = useState<SupaUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSupabaseUser(user);
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      setLoading(false);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSupabaseUser(null);
  };

  return { supabaseUser, profile, loading, signIn, signOut };
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    if (data) setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const addClient = async (client: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (data) setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
    if (data) setClients(prev => prev.map(c => c.id === id ? data : c));
    return { data, error };
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) setClients(prev => prev.filter(c => c.id !== id));
    return { error };
  };

  return { clients, loading, fetchClients, addClient, updateClient, deleteClient };
}

export function useItems(clientId?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('items').select('*').order('section').order('item');
    if (clientId) query = query.eq('client_id', clientId);
    const { data } = await query;
    if (data) setItems(data);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (item: Partial<Item>) => {
    const { data, error } = await supabase.from('items').insert(item).select().single();
    if (data) setItems(prev => [...prev, data]);
    return { data, error };
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === id ? data : i));
    return { data, error };
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) setItems(prev => prev.filter(i => i.id !== id));
    return { error };
  };

  return { items, loading, fetchItems, addItem, updateItem, deleteItem };
}

export function useTickets(clientId?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (clientId) query = query.eq('client_id', clientId);
    const { data } = await query;
    if (data) setTickets(data);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const addTicket = async (ticket: Partial<Ticket>) => {
    const { data, error } = await supabase.from('tickets').insert(ticket).select().single();
    if (data) setTickets(prev => [data, ...prev]);
    return { data, error };
  };

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    const { data, error } = await supabase.from('tickets').update(updates).eq('id', id).select().single();
    if (data) setTickets(prev => prev.map(t => t.id === id ? data : t));
    return { data, error };
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (!error) setTickets(prev => prev.filter(t => t.id !== id));
    return { error };
  };

  return { tickets, loading, fetchTickets, addTicket, updateTicket, deleteTicket };
}

export function useActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (data) setLogs(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const addLog = async (log: Partial<ActivityLog>) => {
    const { data } = await supabase.from('activity_log').insert(log).select().single();
    if (data) setLogs(prev => [data, ...prev]);
  };

  return { logs, loading, addLog };
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const addUser = async (user: Partial<User>) => {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (data) setUsers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (data) setUsers(prev => prev.map(u => u.id === id ? data : u));
    return { data, error };
  };

  return { users, loading, fetchUsers, addUser, updateUser };
}
