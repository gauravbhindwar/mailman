import Header from '../../components/Dashboard/Header';
import Link from 'next/link';
import { auth } from '../../lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login');

  const navItems = [
    { href: '/dashboard/inbox', label: 'Inbox' },
    { href: '/dashboard/sent', label: 'Sent' },
    { href: '/dashboard/archived', label: 'Archive' },
    { href: '/dashboard/trash', label: 'Trash' },
    { href: '/dashboard/compose', label: 'Compose' },
    { href: '/dashboard/settings/email', label: 'Email Setup' }, // Add this line
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 border-r p-4">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block p-2 hover:bg-gray-100 rounded"
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}