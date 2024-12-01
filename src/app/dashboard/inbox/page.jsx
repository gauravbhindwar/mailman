import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/authOptions";
import EmailList from '../../../components/EmailList';
import { getInboxEmails } from '../../../lib/email';
import { Suspense } from 'react';

async function InboxEmailList({ userId }) {
  console.log('Fetching inbox emails for userId:', userId); // Add logging
  const { emails = [] } = await getInboxEmails(userId);
  
  if (!emails || emails.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No emails in inbox</p>
      </div>
    );
  }

  return <EmailList emails={emails} type="inbox" />;
}

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  console.log('Session:', session); // Add logging
  
  if (!session?.user?.id) {
    console.error('No user ID found in session');
    return null;
  }

  return (
    <div className="h-full">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-xl font-bold">Inbox</h2>
        <Link 
          href="/dashboard/compose" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Compose
        </Link>
      </div>
      
      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }>
        <InboxEmailList userId={session.user.id} /> {/* Use id instead of userId */}
      </Suspense>
    </div>
  );
}