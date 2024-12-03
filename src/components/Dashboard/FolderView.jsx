"use client"
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import EmailList from "./EmailList";
import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function FolderEmails({ userId, folder, page, setPage }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails/${folder}?page=${page}&limit=50&refresh=true`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      refreshInterval: 60000,
    }
  );

  const handleRefresh = async () => {
    try {
      await mutate();
    } catch (err) {
      console.error('Refresh failed:', err);
    }
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

  if (data?.error === 'EMAIL_NOT_CONFIGURED') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 mb-4 bg-white border rounded-lg shadow-sm"
      >
        <h3 className="text-lg font-medium text-gray-900">Setup Required</h3>
        <p className="mt-1 text-gray-600">
          Please configure your email settings to view emails.
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

  const emails = data?.emails || [];
  const totalPages = data?.pagination?.pages || 1;

  return (
    <EmailList 
      emails={emails}
      type={folder}
      selectedEmails={selectedEmails}
      setSelectedEmails={setSelectedEmails}
      handleRefresh={handleRefresh}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );
}

export default function FolderView({ folder, title }) {
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
        className="flex justify-between items-center p-4 border-b bg-white"
      >
        <h2 className="text-xl font-bold">{title}</h2>
        <Link 
          href="/dashboard/compose" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Compose
        </Link>
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
          <FolderEmails 
            userId={session.user.id} 
            folder={folder}
            page={page} 
            setPage={setPage}
          />
        </Suspense>
      </div>
    </div>
  );
}
