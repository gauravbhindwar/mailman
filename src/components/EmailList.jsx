'use client';

import { format, parseISO } from 'date-fns';

export default function EmailList({ emails = [], type }) {
  if (!Array.isArray(emails)) {
    console.error('Emails prop is not an array:', emails);
    return <div>No emails to display</div>;
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No {type} emails found</p>
      </div>
    );
  }

  const getDisplayName = (email) => {
    if (type === 'inbox') {
      return email.messages[0]?.externalSender || 
             email.fromEmail || 
             email.participants?.[0]?.email || 
             'Unknown Sender';
    }
    return email.toEmail || 
           email.participants?.[1]?.email || 
           'Unknown Recipient';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className="divide-y divide-gray-200">
      {emails.map((email) => (
        <div key={email.id} className="p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{getDisplayName(email)}</p>
              <p className="text-lg font-semibold">{email.subject}</p>
              <p className="text-gray-600 truncate">
                {email.messages[email.messages.length - 1]?.content?.replace(/<[^>]*>/g, '')}
              </p>
            </div>
            <span className="text-sm text-gray-500 ml-4">
              {formatDate(email.lastMessageAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}