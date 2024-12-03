"use client"
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MdStar, MdStarBorder, MdCheckBox, MdCheckBoxOutlineBlank, MdArchive, MdDelete } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import EmailDetail from './EmailDetail';
import useSWR from 'swr';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Remove VirtualScroll dynamic import

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
  if (!email) return { name: 'Unknown', email: '' };

  // Parse complex email format (Name <email@domain.com>)
  const emailRegex = /^(.*?)?(?:\s*<(.+?)>)?$/;
  const fromField = email.from || '';
  const matches = fromField.match(emailRegex);

  if (matches) {
    const [_, name, emailAddr] = matches;
    return {
      name: name?.trim().replace(/["']/g, '') || emailAddr?.split('@')?.[0] || 'Unknown',
      email: emailAddr || fromField || ''
    };
  }

  // Fallback for simple email addresses
  const emailParts = fromField.split('@');
  return {
    name: emailParts[0] || 'Unknown',
    email: fromField || ''
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

const getPreviewText = (content) => {
  if (!content) return 'No message content';
  
  if (typeof content === 'object') {
    content = content.html || content.text || '';
  }

  const div = document.createElement('div');
  div.innerHTML = content;
  const text = div.textContent || div.innerText || '';
  return text.trim().substring(0, 60) + (text.length > 60 ? '...' : '');
};

const formatEmail = (email) => {
  if (!email) return null;
  
  return {
    id: email.id || email.uid || email.messageId,
    from: email.from || 'Unknown Sender',
    to: email.to || '',
    subject: email.subject || '(No Subject)',
    content: email.content || '',
    date: email.date ? new Date(email.date) : new Date(),
    read: email.read || false,
    starred: email.starred || false,
    labels: email.labels || [],
    folder: email.folder || 'inbox'
  };
};

// Move getSenderDetails outside component
const getSenderDetails = (formattedEmail, type) => {
  if (!formattedEmail) return { name: 'Unknown', email: '', isRecipient: false };
  
  if (type === 'sent') {
    const toMatch = formattedEmail.to.match(/^(.*?)?(?:\s*<(.+?)>)?$/);
    return {
      name: toMatch ? toMatch[1]?.trim() || toMatch[2]?.split('@')[0] : 'Unknown',
      email: toMatch ? toMatch[2] || formattedEmail.to : formattedEmail.to,
      isRecipient: true
    };
  }
  return { ...getSenderInfo(formattedEmail, type), isRecipient: false };
};

const EmailItem = React.memo(function EmailItem({ email, type, selectedEmails, toggleEmailSelection, toggleStar, itemVariants, onClick, showAll }) {
  const formattedEmail = formatEmail(email);
  
  if (!formattedEmail) return null;

  // Direct calculation instead of useMemo
  const sender = getSenderDetails(formattedEmail, type);

  const lastMessage = formattedEmail.messages?.[formattedEmail.messages.length - 1] || {};
  const messageDate = formattedEmail.lastMessageAt || formattedEmail.date;

  // Safe date formatting
  const getFormattedDate = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get preview text without HTML tags
  const handleClick = (e) => {
    e.preventDefault(); // Prevent Link navigation
    onClick(e, formattedEmail);
  };

  return (
    <motion.div
      variants={itemAnimation}
      whileHover={{ 
        scale: 1.002,
        backgroundColor: 'rgba(242, 245, 245, 0.8)',
        transition: { duration: 0.2 }
      }}
      className={`group relative ${!formattedEmail.read ? 'bg-blue-50' : 'bg-white'} border-b border-gray-100`}
    >
      <div className="flex items-center p-4 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center space-x-2 min-w-[80px]">
          {/* Selection and Star buttons */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleEmailSelection(formattedEmail.id, e);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-gray-600"
          >
            {selectedEmails.includes(formattedEmail.id) ? (
              <MdCheckBox className="w-5 h-5" />
            ) : (
              <MdCheckBoxOutlineBlank className="w-5 h-5" />
            )}
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(formattedEmail.id, e);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-yellow-400"
          >
            {formattedEmail.starred ? (
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
                  className={`font-medium ${!formattedEmail.read ? 'font-semibold' : ''}`}
                  whileHover={{ scale: 1.02 }}
                >
                  {type === 'sent' ? `To: ${sender.name}` : sender.name}
                </motion.span>
                <TagBadge tag={getMessageTag(formattedEmail, type)} />
              </div>
              <motion.span 
                className="text-xs text-gray-500"
                whileHover={{ scale: 1.02 }}
              >
                {type === 'sent' ? sender.email : formattedEmail.from}
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
            {formattedEmail.subject || '(No Subject)'}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 overflow-hidden">
            {formattedEmail.messages?.[0]?.content ? 
              getPreviewText(formattedEmail.messages[0].content) : 
              getPreviewText(formattedEmail.content)}
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
          </motion.button> {/* Corrected closing tag */}
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

const EmailList = ({ emails = [], type, selectedEmails = [], setSelectedEmails, itemVariants, showAll, page, limit }) => {
  const [isClient, setIsClient] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // renamed from isLoading
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    setIsClient(true);
    setInitialLoading(false);
  }, []);

  // Move useSWR before handleRefresh
  const { data, error, isLoading: fetchLoading, mutate } = useSWR(
    `/api/emails/${showAll ? 'all' : 'inbox'}?page=${page}&limit=${limit}`,
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

  // Now define handleRefresh after useSWR
  const handleRefresh = useCallback(async () => {
    try {
      await mutate();
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  }, [mutate]);

  const memoizedValue = useMemo(() => {
    const formattedEmails = (Array.isArray(emails) ? emails : [])
      .map(formatEmail)
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return formattedEmails;
  }, [emails]);

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
    e.stopPropagation();
    setSelectedEmail(email);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEmail(null);
  }, []);

  useEffect(() => {
    // Optionally refresh on mount
    handleRefresh();
  }, [handleRefresh]);

  const renderEmailItem = useCallback(({ index, style }) => {
  }, [memoizedValue, type, selectedEmails, toggleEmailSelection, toggleStar, itemVariants, handleEmailClick, showAll]);

  // Show loading state
  if (initialLoading || fetchLoading) {
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

  // Render regular list during SSR
  if (!isClient) {
    return (
      <div className="relative w-full">
        <motion.div
          variants={listAnimation}
          initial="hidden"
          animate="show"
          className="divide-y divide-gray-100"
        >
          {memoizedValue.slice(0, 10).map((email) => (
            <EmailItem
              key={generateUniqueKey(email)}
              email={email}
              type={type}
              selectedEmails={selectedEmails}
              toggleEmailSelection={toggleEmailSelection}
              toggleStar={toggleStar}
              itemVariants={itemVariants}
              onClick={handleEmailClick}
              showAll={showAll}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  // Render virtualized list on client
  return (
    <>
      <div className="relative w-full h-[calc(100vh-200px)]"> {/* Fixed height container */}
        <div className="absolute inset-0">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={memoizedValue.length}
                itemSize={100} // Increased item size for better visibility
                overscanCount={5}
                className="divide-y divide-gray-100"
              >
                {({ index, style }) => (
                  <div style={{ ...style, width: '100%' }}>
                    <EmailItem
                      key={generateUniqueKey(memoizedValue[index])}
                      email={memoizedValue[index]}
                      type={type}
                      selectedEmails={selectedEmails}
                      toggleEmailSelection={toggleEmailSelection}
                      toggleStar={toggleStar}
                      itemVariants={itemVariants}
                      onClick={handleEmailClick}
                      showAll={showAll}
                    />
                  </div>
                )}
              </List>
            )}
          </AutoSizer>
        </div>

        {selectedEmail && (
          <EmailDetail 
            email={selectedEmail}
            onClose={handleCloseDetail}
          />
        )}
      </div>
    </>
  );
};

export default React.memo(EmailList);