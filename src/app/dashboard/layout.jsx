import Header from '../../components/Dashboard/Header';
import Link from 'next/link';
import { auth } from '../../lib/auth';
import { redirect } from 'next/navigation';
import { 
  InboxIcon, 
  PaperAirplaneIcon, // Changed from SendIcon
  ArchiveBoxIcon,    // Changed from ArchiveIcon
  TrashIcon, 
  PencilSquareIcon,  // Changed from PencilIcon
  Cog6ToothIcon      // Changed from CogIcon
} from '@heroicons/react/24/outline';

export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login');

  const navItems = [
    { href: '/dashboard/inbox', label: 'Inbox', icon: InboxIcon },
    { href: '/dashboard/sent', label: 'Sent', icon: PaperAirplaneIcon },
    { href: '/dashboard/archived', label: 'Archive', icon: ArchiveBoxIcon },
    { href: '/dashboard/trash', label: 'Trash', icon: TrashIcon },
    { href: '/dashboard/compose', label: 'Compose', icon: PencilSquareIcon },
    { href: '/dashboard/settings/email', label: 'Email Setup', icon: Cog6ToothIcon },
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 border-r border-gray-200 p-3 transition-all duration-300 hover:w-56">
          <div className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200
                         text-gray-700 hover:text-gray-900 hover:bg-gray-100
                         group relative overflow-hidden"
              >
                <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}