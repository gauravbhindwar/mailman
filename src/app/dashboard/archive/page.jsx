"use client"

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmailList from '@/components/Dashboard/EmailList';
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdRefresh, 
  MdMoreVert, 
  MdCheckBox, 
  MdCheckBoxOutlineBlank,
  MdArchive,
  MdDelete,
  MdLabel,
  MdSchedule
} from 'react-icons/md';
import useSWR from 'swr';

// Animation variants
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

// Add fetcher function
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function EmailListToolbar({ selectedEmails, onRefresh }) {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-4 p-2 border-b"
    >
      <button className="p-2 hover:bg-gray-100 rounded">
        {selectedEmails.length > 0 ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
      </button>
      <button 
        onClick={onRefresh}
        className="p-2 hover:bg-gray-100 rounded"
      >
        <MdRefresh />
      </button>
      <button className="p-2 hover:bg-gray-100 rounded">
        <MdMoreVert />
      </button>
      {selectedEmails.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-2"
        >
          <button className="p-2 hover:bg-gray-100 rounded" title="Archive">
            <MdArchive />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded" title="Delete">
            <MdDelete />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded" title="Label">
            <MdLabel />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded" title="Snooze">
            <MdSchedule />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

function SetupEmailBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 mb-4 bg-white border rounded-lg shadow-sm"
    >
      <h3 className="text-lg font-medium text-gray-900">Welcome to your Archive!</h3>
      <p className="mt-1 text-gray-600">
        To start receiving emails, you need to configure your email settings first.
      </p>
      <Link
        href="/dashboard/settings/email"
        className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Configure Email Settings
      </Link>
    </motion.div>
  );
}

function ArchiveEmailList({ userId, page, setPage }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails/archive?userId=${userId}&page=${page}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  );

  const handleRefresh = async () => {
    try {
      await fetch(`/api/emails/archive?userId=${userId}&refresh=true`);
      await mutate();
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  };

  useEffect(() => {
    // Only refresh if we have data and no explicit error
    if (data?.success === false && !data?.error) {
      handleRefresh();
    }
  }, [data]);

  // Show loading state
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center h-64"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </motion.div>
    );
  }

  // Show configuration banner if not configured
  if (data?.error === 'EMAIL_NOT_CONFIGURED') {
    return <SetupEmailBanner />;
  }

  if (!data?.emails?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center py-8 text-gray-500"
      >
        <p>No emails in archive</p>
      </motion.div>
    );
  }

  const emails = data?.emails || [];
  const totalPages = data?.pagination?.pages || 1;

  return (
    <div className="flex flex-col h-full">
      <EmailListToolbar 
        selectedEmails={selectedEmails}
        onRefresh={handleRefresh}
      />
      
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-auto"
      >
        <AnimatePresence>
          {emails.length > 0 ? (
            <EmailList 
              emails={emails} 
              type="archive"
              selectedEmails={selectedEmails}
              setSelectedEmails={setSelectedEmails}
              itemVariants={itemVariants}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-500"
            >
              <p>No emails in archive</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-center gap-2 p-4 border-t"
      >
        {Array.from({ length: totalPages }, (_, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPage(index + 1)}
            className={`px-3 py-1 rounded ${
              page === index + 1 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {index + 1}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

import FolderView from '@/components/Dashboard/FolderView';

export default function ArchivePage() {
  return <FolderView folder="archive" title="Archive" />;
}