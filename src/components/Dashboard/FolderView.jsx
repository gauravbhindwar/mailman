"use client"
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import EmailList from "./EmailList";
import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const getPreviewText = (email) => {
  if (!email) return '';

  let content = '';

  // Extract content from various possible formats
  if (typeof email.content === 'string') {
    content = email.content;
  } else if (email.content?.html || email.content?.text) {
    content = email.content.html || email.content.text;
  } else if (email.messages?.[0]?.content) {
    content = typeof email.messages[0].content === 'string' 
      ? email.messages[0].content 
      : email.messages[0].content.html || email.messages[0].content.text;
  }

  // Strip HTML tags and get plain text
  const div = document.createElement('div');
  div.innerHTML = content;
  const text = div.textContent || div.innerText || '';
  return text.trim().substring(0, 100) + (text.length > 100 ? '...' : '');
};

function FolderEmails({ userId, folder, page, setPage, showAll }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const limit = 50;
  const apiFolder = showAll ? 'all' : folder;

  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails/${apiFolder}?page=${page}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      refreshInterval: 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      shouldRetryOnError: true,
      onError: (err) => {
        console.error('Fetch error:', err);
      }
    }
  );

  const handleRefresh = useCallback(async () => {
    try {
      await mutate(
        `/api/emails/${apiFolder}?page=${page}&limit=${limit}&timestamp=${Date.now()}`,
        { revalidate: true }
      );
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }, [mutate, apiFolder, page, limit]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]); // Added handleRefresh

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (data?.error === 'EMAIL_NOT_CONFIGURED') {
    return <div>Email not configured</div>;
  }

  // Update email mapping to include content
  const emails = Array.isArray(data?.emails) ? data.emails.map(email => ({
    ...email,
    previewText: getPreviewText(email)
  })) : [];
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
            showAll={showAll}
          />
        </Suspense>
      </div>
    </div>
  );
}
