"use client"
import { useEffect, useState, Suspense } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import EmailList from './EmailList';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import FolderToolbar from './FolderToolbar';
import { MdDeleteForever } from 'react-icons/md';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function FolderView({ folder, title }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [selectedEmails, setSelectedEmails] = useState([]);

  const { data, error, mutate } = useSWR(
    session?.user?.id ? `/api/emails/${folder}?page=${page}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handlePermanentDelete = async (emailIds) => {
    try {
      const response = await fetch('/api/emails/permanently-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      });
      
      if (!response.ok) throw new Error('Failed to delete emails');
      
      mutate(); // Refresh the email list
    } catch (error) {
      console.error('Failed to permanently delete:', error);
      // Add error notification here
    }
  };

  const toolbarActions = folder === 'trash' ? {
    extraButtons: (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => selectedEmails.length && handlePermanentDelete(selectedEmails)}
        className="p-2 hover:bg-red-100 rounded-full text-red-600"
        title="Permanently Delete"
      >
        <MdDeleteForever className="w-5 h-5" />
      </motion.button>
    ),
    // Add a warning message for trash actions
    selectionMessage: "Selected emails will be permanently deleted"
  } : {};

  if (status === "loading" || !session?.user?.id) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full flex flex-col">
      <FolderToolbar 
        title={title}
        selectedEmails={selectedEmails}
        onRefresh={() => mutate()}
        {...toolbarActions}
      />
      <div className="flex-1 overflow-auto">
        <EmailList 
          emails={data?.emails || []}
          type={folder}
          selectedEmails={selectedEmails}
          setSelectedEmails={setSelectedEmails}
        />
      </div>
    </div>
  );
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);
