"use client"
import Link from 'next/link';
import { useEffect, useState, Suspense, useCallback } from 'react';
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
    <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-wrap md:flex-nowrap items-center justify-between px-4 py-2 gap-2"
      >
        {/* Left side controls */}
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto">
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-300">
            {selectedEmails.length > 0 ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
          </button>
          <button 
            onClick={onRefresh}
            className="p-2 hover:bg-white/10 rounded-full text-gray-300"
          >
            <MdRefresh />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-300">
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

        {/* Right side pagination - Hide on very small screens, show on md and up */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded-md border border-white/10 text-gray-300 ${
              page === 1 
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/10'
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-300 min-w-[100px] text-center">
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

function InboxEmailList({ userId, page, setPage, showAll }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const folder = showAll ? 'all' : 'inbox';
  const limit = 50;

  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails/${folder}?page=${page}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 0,
      suspense: false,
      keepPreviousData: true,
      onError: (err) => {
        console.error('Fetch error:', err);
      }
    }
  );

  const handleRefresh = useCallback(() => {
    return mutate(
      `/api/emails/${folder}?page=${page}&limit=${limit}&refresh=true&t=${Date.now()}`,
      undefined, 
      { revalidate: true }
    ).catch(err => {
      console.error('Refresh failed:', err);
    });
  }, [mutate, folder, page, limit]);

  // Single refresh effect
  useEffect(() => {
    handleRefresh();
    const handleBrowserRefresh = () => handleRefresh();
    window.addEventListener('beforeunload', handleBrowserRefresh);
    return () => window.removeEventListener('beforeunload', handleBrowserRefresh);
  }, [handleRefresh]);

  // Prefetch next page
  useEffect(() => {
    if (data?.pagination?.hasMore) {
      const nextPage = page + 1;
      fetcher(`/api/emails/${folder}?page=${nextPage}&limit=${limit}`);
    }
  }, [data, page, folder, limit]);

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

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-gray-500"
      >
        <p>Error loading emails: {error.message}</p>
      </motion.div>
    );
  }

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
      
      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(100vh-180px)]"> {/* Adjust height to account for header and toolbar */}
          <EmailList 
            emails={emails} 
            type="inbox"
            selectedEmails={selectedEmails}
            setSelectedEmails={setSelectedEmails}
            itemVariants={itemVariants}
            showAll={showAll}
            page={page}
            limit={limit}
          />
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

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
    <div className="flex flex-col h-full">
      <div className="flex-none">
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center p-2 border-b bg-gradient-to-r from-orange-300 to-purple-400 shadow-sm"
      >
          <h2 className="text-xl font-semibold">Inbox</h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
             <Link 
              href="/dashboard/compose" 
              className="bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:from-green-500 hover:to-blue-600 transform transition-transform duration-200 hover:scale-105"
            >
              Compose
            </Link>
          </motion.div>
        </motion.div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <InboxEmailList 
          userId={session.user.id} 
          page={page} 
          setPage={setPage} 
          showAll={showAll} 
        />
      </div>
    </div>
  );
}