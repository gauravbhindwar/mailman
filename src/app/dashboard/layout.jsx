import Header from '../../components/Dashboard/Header';
import Navigation from '@/components/Dashboard/Navigation';
import { auth } from '../../lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login');

  const navItems = [
    { href: '/dashboard/inbox', label: 'Inbox', icon: 'Inbox' },
    { href: '/dashboard/sent', label: 'Sent', icon: 'PaperAirplane' },
    { href: '/dashboard/archive', label: 'Archive', icon: 'ArchiveBox' },
    { href: '/dashboard/spam', label: 'Spam', icon: 'ExclamationCircle' },
    { href: '/dashboard/trash', label: 'Trash', icon: 'Trash' },
    { href: '/dashboard/compose', label: 'Compose', icon: 'PencilSquare' },
    { href: '/dashboard/settings/email', label: 'Email Setup', icon: 'Cog6Tooth' },
    { href: '/dashboard/all-emails', label: 'Show All Emails', icon: 'ExclamationCircle' } // Ensure this line is included
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Navigation items={navItems} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}