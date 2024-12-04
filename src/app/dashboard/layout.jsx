'use client';

import { useState } from 'react';
import Header from '../../components/Dashboard/Header';
import Navigation from '@/components/Dashboard/Navigation';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (status === 'loading') return null;
  if (!session) redirect('/login');

  const navItems = [
    { href: '/dashboard/inbox', label: 'Inbox', icon: 'Inbox' },
    { href: '/dashboard/sent', label: 'Sent', icon: 'PaperAirplane' },
    { href: '/dashboard/archive', label: 'Archive', icon: 'ArchiveBox' }, // Fixed missing label and icon name
    { href: '/dashboard/spam', label: 'Spam', icon: 'ExclamationCircle' },
    { href: '/dashboard/trash', label: 'Trash', icon: 'Trash' },
    { href: '/dashboard/compose', label: 'Compose', icon: 'PencilSquare' },
    { href: '/dashboard/settings/email', label: 'Email Setup', icon: 'Cog6Tooth' },
    { href: '/dashboard/all-emails', label: 'Show All Emails', icon: 'ExclamationCircle' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 relative">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative z-10">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="flex pt-[73px] min-h-screen">
          <Navigation 
            items={navItems} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden z-30 mt-[73px]"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <main className="flex-1 w-full md:pl-64 min-h-[calc(100vh-73px)]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}