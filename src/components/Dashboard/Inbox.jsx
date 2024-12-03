"use client"
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import EmailList from './EmailList';
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

function EmailListToolbar({ selectedEmails, onRefresh, page, totalPages, onPageChange }) {
  return (
    <div className="sticky top-0 z-50 bg-white shadow-sm">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-4 py-2 border-b"
      >
        {/* Left side controls */}
        <div className="flex items-center gap-4">
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
        </div>

        {/* Right side pagination - Always show */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded-md border ${
              page === 1 
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 min-w-[100px] text-center">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded-md border ${
              page === totalPages
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SetupEmailBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 mb-4 bg-white border rounded-lg shadow-sm"
    >
      <h3 className="text-lg font-medium text-gray-900">Welcome to your Inbox!</h3>
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


function PaginationBar({ currentPage, totalPages, onPageChange }) {
  // Calculate page range to show
  const getPageRange = () => {
    const delta = 2; // Pages to show before and after current page
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= Math.min(totalPages, 1 + 2 * delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 1 + delta) {
      range.push(null); // Add dots
    }
    for (let i = Math.max(1 + 2 * delta, currentPage - delta); i <= Math.min(currentPage + delta, totalPages); i++) {
      if (!range.includes(i)) {
        range.push(i);
      }
    }
    if (currentPage + delta < totalPages - delta) {
      range.push(null); // Add dots
    }
    for (let i = Math.max(totalPages - 2 * delta, currentPage + delta); i <= totalPages; i++) {
      if (!range.includes(i)) {
        range.push(i);
      }
    }

    return range;
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex justify-center items-center gap-2 py-4 px-6 border-t bg-white w-full"
    >
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-50"
      >
        Previous
      </button>

      <div className="flex items-center gap-2 mx-4">
        {getPageRange().map((pageNum, idx) => 
          pageNum === null ? (
            <span key={`dot-${idx}`} className="px-2">...</span>
          ) : (
            <motion.button
              key={pageNum}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPageChange(pageNum)}
              className={`px-4 py-2 rounded-md ${
                currentPage === pageNum 
                  ? 'bg-blue-500 text-white' 
                  : 'border hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </motion.button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-50"
      >
        Next
      </button>
    </motion.div>
  );
}

function InboxEmailList({ userId, page, setPage }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const folder = 'inbox'; // Add this line to define the folder
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails/${folder}?page=${page}&limit=50&refresh=true`, // Update URL to use new API route
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Increase to 30 seconds
      refreshInterval: 60000, // Increase to 1 minute
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Only retry up to 3 times and not for 404s
        if (retryCount >= 3 || error.status === 404) return;
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 5000);
      },
    }
  );

  const handleRefresh = async () => {
    try {
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

  if (!data?.emails) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center py-8 text-gray-500"
      >
        <p>Loading emails...</p>
      </motion.div>
    );
  }

  const emails = Array.isArray(data.emails) ? data.emails : [];
  const totalPages = data?.pagination?.pages || 1;

  return (
    <div className="flex flex-col h-full">
      <EmailListToolbar 
        selectedEmails={selectedEmails}
        onRefresh={handleRefresh}
        page={page}
        totalPages={data?.pagination?.pages || 1}
        onPageChange={setPage}
      />
      
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-auto">
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {emails.length > 0 ? (
                <EmailList 
                  emails={emails} 
                  type="inbox"
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
                  <p>No emails found</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center p-4 border-b bg-white z-10"
      >
        <h2 className="text-xl font-bold">Inbox</h2>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link 
            href="/dashboard/compose" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Compose
          </Link>
        </motion.div>
      </motion.div>
      
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center h-full"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </motion.div>
        }>
          <InboxEmailList userId={session.user.id} page={page} setPage={setPage} />
        </Suspense>
      </div>
    </div>
  );
}