'use client';

import { create } from 'zustand';
import { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  profile: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user, profile: user }),
}));
