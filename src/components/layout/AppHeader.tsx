'use client';

import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';

export default function AppHeader() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { profile } = useAuthStore();

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 sticky top-0 z-30">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3 cursor-pointer"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{profile?.email}</span>
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-500">
          {profile?.name?.charAt(0) || '?'}
        </div>
      </div>
    </header>
  );
}
