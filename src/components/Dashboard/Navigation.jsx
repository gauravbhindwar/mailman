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

export default function Navigation({ items, isOpen, onClose }) {
  const pathname = usePathname();

  return (
    <nav className={clsx(
      'fixed md:fixed inset-y-0 left-0 transform md:translate-x-0 transition-transform duration-300 ease-in-out',
      'w-64 backdrop-blur-xl bg-white/10 border-r border-white/20 flex flex-col z-40',
      'mt-[73px]', // Account for header height
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      <div className="flex-1">
        <div className="md:hidden flex justify-end px-4 pb-4">
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const IconComponent = iconMap[item.icon];
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-300 hover:bg-white/10 hover:text-blue-400'
                  )}>
                  <IconComponent
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                      isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'
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
