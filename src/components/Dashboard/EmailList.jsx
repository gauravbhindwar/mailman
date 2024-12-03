"use client"
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MdStar, MdStarBorder, MdCheckBox, MdCheckBoxOutlineBlank, MdArchive, MdDelete } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import EmailDetail from './EmailDetail';
import useSWR from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// Helper functions
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRandomColor = (str) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
  ];
  return colors[str ? str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0];
};

const getSenderInfo = (email, type) => {
  if (!email) return { name: 'Unknown', email: 'unknown@example.com' };

  // For IMAP ENVELOPE format (e.g., Google notifications)
  if (email.envelope) {
    const sender = email.envelope.from?.[0];
    if (sender) {
      return {
        name: sender.name || sender.mailbox || email.from,
        email: sender.mailbox ? `${sender.mailbox}@${sender.host}` : email.from
      };
    }
  }

  // For emails from external sources
  if (email.from) {
    // Parse the 'From' field which might be in format: "name" <email> or name <email>
    const matches = email.from.match(/(?:"?([^"]*)"?\s*)?(?:<(.+)>|\((.+)\))?/);
    if (matches) {
      const [_, name, email1, email2] = matches;
      const displayName = name?.trim() || email2?.trim();
      const emailAddress = (email1 || email2 || email.from)?.trim();

      if (displayName && emailAddress) {
        return {
          name: displayName.replace(/^"(.*)"$/, '$1'), // Remove quotes if present
          email: emailAddress.replace(/[<>]/g, '') // Remove angle brackets if present
        };
      }
    }
  }

  // For Gmail-specific formats
  if (email.headers && email.headers['x-gmail-from']) {
    const gmailFrom = email.headers['x-gmail-from'];
    const [name, address] = gmailFrom.split('<').map(part => part.replace(/[<>]/g, '').trim());
    if (name && address) {
      return { name, email: address };
    }
  }

  // Fallback to simple email parsing
  const emailParts = (email.from || '').split('@');
  return {
    name: emailParts[0] || 'Unknown',
    email: email.from || 'unknown@example.com'
  };
};

const listAnimation = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnimation = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

const getMessageTag = (email, type) => {
  if (email.status) return email.status;
  if (type === 'inbox' && email.messages?.[0]?.externalSender) return 'received';
  if (type === 'sent') return 'sent';
  if (email.flags?.includes('\\Draft')) return 'draft';
  if (email.labels?.includes('\\Spam')) return 'spam';
  if (email.labels?.includes('\\Trash')) return 'trash';
  if (email.labels?.includes('\\Starred')) return 'starred';
  return 'inbox';
};

const TagBadge = ({ tag }) => {
  const tagColors = {
    received: 'bg-blue-100 text-blue-800 border border-blue-200',
    sent: 'bg-green-100 text-green-800 border border-green-200',
    draft: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    spam: 'bg-red-100 text-red-800 border border-red-200',
    trash: 'bg-gray-100 text-gray-800 border border-gray-200',
    starred: 'bg-purple-100 text-purple-800 border border-purple-200',
    inbox: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    archived: 'bg-gray-100 text-gray-800 border border-gray-200'
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${tagColors[tag] || tagColors.inbox}`}>
      {tag.charAt(0).toUpperCase() + tag.slice(1)}
    </span>
  );
};

const EmailItem = React.memo(function EmailItem({ email, type, selectedEmails, toggleEmailSelection, toggleStar, itemVariants, onClick, showAll }) {
  const sender = getSenderInfo(email, type);
  const lastMessage = email.messages?.[email.messages.length - 1] || {};
  const messageDate = email.lastMessageAt || email.date;

  // Safe date formatting
  const getFormattedDate = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get preview text without HTML tags
  const getPreviewText = (content) => {
    const div = document.createElement('div');
    div.innerHTML = content || '';
    return div.textContent?.substring(0, 60) || 'No content';
  };

  const handleClick = (e) => {
    e.preventDefault(); // Prevent Link navigation
    onClick(e, email);
  };

  return (
    <motion.div
      variants={itemAnimation}
      whileHover={{ 
        scale: 1.002,
        backgroundColor: 'rgba(242, 245, 245, 0.8)',
        transition: { duration: 0.2 }
      }}
      className={`group relative ${!email.read ? 'bg-blue-50' : 'bg-white'} border-b border-gray-100`}
    >
      <div className="flex items-center p-4 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center space-x-2 min-w-[80px]">
          {/* Selection and Star buttons */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleEmailSelection(email.id, e);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-gray-600"
          >
            {selectedEmails.includes(email.id) ? (
              <MdCheckBox className="w-5 h-5" />
            ) : (
              <MdCheckBoxOutlineBlank className="w-5 h-5" />
            )}
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(email.id, e);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-yellow-400"
          >
            {email.starred ? (
              <MdStar className="w-5 h-5 text-yellow-400" />
            ) : (
              <MdStarBorder className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Avatar with hover effect */}
        <motion.div 
          className="mr-4"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium 
            ${getRandomColor(sender.email)} shadow-md`}
          >
            {getInitials(sender.name)}
          </div>
        </motion.div>

        {/* Email Content with improved layout */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <motion.span 
                  className={`font-medium ${!email.read ? 'font-semibold' : ''}`}
                  whileHover={{ scale: 1.02 }}
                >
                  {sender.name}
                </motion.span>
                <TagBadge tag={getMessageTag(email, type)} />
              </div>
              <motion.span 
                className="text-xs text-gray-500"
                whileHover={{ scale: 1.02 }}
              >
                {sender.email}
              </motion.span>
            </div>
            <motion.span 
              className="text-sm text-gray-500 ml-2 whitespace-nowrap"
              whileHover={{ scale: 1.02 }}
            >
              {messageDate ? getFormattedDate(messageDate) : 'Unknown date'}
            </motion.span>
          </div>
          <h3 className="text-sm font-medium text-gray-800 mb-1 truncate">
            {email.subject || '(No Subject)'}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 overflow-hidden">
            {getPreviewText(lastMessage.content)}
          </p>
        </div>

        {/* Hover Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="hidden group-hover:flex items-center gap-2 absolute right-4"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <MdArchive className="w-5 h-5 text-gray-500" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <MdDelete className="w-5 h-5 text-gray-500" />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
});

const generateUniqueKey = (email) => {
  const baseId = email.id || email.messageId || email.uid;
  const timestamp = email.date || email.lastMessageAt || Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  return `${baseId}-${timestamp}-${randomSuffix}`;
};

const EmailList = ({ emails, type, selectedEmails, setSelectedEmails, itemVariants, showAll }) => {
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  const toggleEmailSelection = useCallback((emailId, e) => {
    e.preventDefault();
    setSelectedEmails(prev => 
      prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
    );
  }, [setSelectedEmails]);

  const toggleStar = useCallback(async (emailId, e) => {
    e.preventDefault();
    // Implement star toggle functionality
  }, []);

  const handleEmailClick = useCallback((e, email) => {
    e.preventDefault();
    setSelectedEmail(email);
  }, []);

  // Sort emails by date (latest first)
  const sortedEmails = [...emails].sort((a, b) => {
    const dateA = new Date(a.date || a.lastMessageAt || 0);
    const dateB = new Date(b.date || b.lastMessageAt || 0);
    return dateB - dateA;
  });

  if (!Array.isArray(emails) || emails.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-64 text-gray-500"
      >
        <div className="text-xl mb-2">No emails found</div>
        <div className="text-sm">Your {type} is empty</div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full">
      <motion.div 
        variants={listAnimation}
        initial="hidden"
        animate="show"
        className="divide-y divide-gray-100"
      >
        {sortedEmails.map((email) => (
          <EmailItem
            key={generateUniqueKey(email)}
            email={email}
            type={type}
            selectedEmails={selectedEmails}
            toggleEmailSelection={toggleEmailSelection}
            toggleStar={toggleStar}
            itemVariants={itemVariants}
            onClick={handleEmailClick}
            showAll={showAll} // Pass showAll prop
          />
        ))}
      </motion.div>

      {selectedEmail && (
        <EmailDetail 
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
};

export default React.memo(EmailList);