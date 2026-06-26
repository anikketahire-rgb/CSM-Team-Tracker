'use client';

import { ReactNode, useEffect } from 'react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function SlidePanel({ open, onClose, title, children, width = 'w-[480px]' }: SlidePanelProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl z-50 ${width} overflow-y-auto transition-transform`}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  );
}

export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2.5">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-gray-700">{children || <span className="text-gray-300">—</span>}</div>
    </div>
  );
}

export function InlineSelect({ value, options, onChange, className = '' }: { value: string; options: string[]; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent border-0 text-sm font-medium cursor-pointer outline-none hover:bg-gray-50 rounded px-1.5 py-0.5 transition-colors ${className}`}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
