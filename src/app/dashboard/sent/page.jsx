import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/authOptions";
import EmailList from '../../../components/EmailList';
import { getSentEmails } from '../../../lib/email';
import { Suspense } from 'react';

async function SentEmailList({ userId }) {
  console.log('Fetching sent emails for userId:', userId); // Add logging
  const { emails = [] } = await getSentEmails(userId);
  
  if (!emails || emails.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No sent emails</p>
      </div>
    );
  }

  return <EmailList emails={emails} type="sent" />;
}

export default async function SentPage() {
  const session = await getServerSession(authOptions);
  console.log('Session:', session); // Add logging

  if (!session?.user?.id) {
    console.error('No user ID found in session');
    return null;
  }
  
  return (
    <div className="h-full">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-xl font-bold">Sent</h2>
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
        <SentEmailList userId={session.user.id} /> {/* Use id instead of userId */}
      </Suspense>
    </div>
  );
}