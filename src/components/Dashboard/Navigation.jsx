'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { 
  InboxIcon, 
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  TrashIcon, 
  PencilSquareIcon,
  Cog6ToothIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const iconMap = {
  Inbox: InboxIcon,
  PaperAirplane: PaperAirplaneIcon,
  ArchiveBox: ArchiveBoxIcon,
  Trash: TrashIcon,
  PencilSquare: PencilSquareIcon,
  Cog6Tooth: Cog6ToothIcon,
  ExclamationCircle: ExclamationCircleIcon,
};

export default function Navigation({ items, isAuthenticated }) {
  const pathname = usePathname();

  if (!isAuthenticated) return null;

  return (
    <nav className="w-64 bg-white border-r border-gray-200 pt-5 pb-4 flex flex-col">
      <div className="flex-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const IconComponent = iconMap[item.icon];
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'group flex items-center px-4 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-gray-100 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  )}
                >
                  <IconComponent
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
