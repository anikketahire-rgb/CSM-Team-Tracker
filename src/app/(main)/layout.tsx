'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useData';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/layout/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/utils';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const { sidebarOpen } = useUIStore();

  useEffect(() => {
    setUser(profile);
  }, [profile, setUser]);

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4556e0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cn('transition-all duration-300', sidebarOpen ? 'ml-60' : 'ml-0')}>
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
