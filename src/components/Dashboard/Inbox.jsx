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

function InboxEmailList({ userId, page, setPage }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails/inbox?userId=${userId}&page=${page}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // Cache for 10 seconds
    }
  );

  const handleRefresh = () => {
    mutate(); // This will trigger a revalidation
  };

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

  const emails = data?.emails || [];
  const totalPages = data?.totalPages || 1;

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
              <p>No emails in inbox</p>
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
    <div className="h-full flex flex-col relative">
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
      
      <div className="flex-1 overflow-auto relative">
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