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

const parseEmailForDisplay = (emailStr) => {
  if (!emailStr) return { displayName: 'Unknown', email: '' };
  
  const matches = emailStr.match(/^(.*?)?(?:\s*<(.+?)>)?$/);
  if (matches) {
    const [_, name, email] = matches;
    return {
      displayName: name?.trim() || email?.split('@')[0] || 'Unknown',
      email: email || emailStr.split('<')[1]?.split('>')[0] || emailStr
    };
  }
  
  const emailParts = emailStr.split('@');
  return {
    displayName: emailParts[0] || 'Unknown',
    email: emailStr
  };
};

const getFormattedDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    
    // Format the server timestamp in user's timezone
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  } catch (error) {
    return 'Invalid date';
  }
};

const formatDisplayDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    
    // If same year, show MMM D, h:mm A
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    }
    
    // If different year, show MMM D, YYYY
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

const Avatar = ({ name, email, size = 'md' }) => {
  const initial = getInitials(name);
  const colorClass = getRandomColor(email);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium ${colorClass}`}
      title={name}
    >
      {initial}
    </div>
  );
};

const EmailItem = React.memo(function EmailItem({ email, type, selectedEmails, toggleEmailSelection, toggleStar, onClick, showAll }) {
  const senderInfo = getSenderInfo(email, type);
  const messageTag = getMessageTag(email, type);
  const formattedEmail = formatEmail(email);
  
  if (!formattedEmail) return null;

  return (
    <motion.div variants={itemAnimation} className="group px-2 py-1">
      <div 
        className="backdrop-blur-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-xl overflow-hidden"
        onClick={(e) => onClick(e, formattedEmail)} // Make entire item clickable
      >
        {/* Mobile Layout */}
        <div className="block md:hidden p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEmailSelection(formattedEmail.id, e);
                }}
                className="p-1"
              >
                {selectedEmails.includes(formattedEmail.id) ? 
                  <MdCheckBox className="w-5 h-5 text-blue-500" /> : 
                  <MdCheckBoxOutlineBlank className="w-5 h-5 text-gray-400" />
                }
              </button>
              <Avatar name={senderInfo.name} email={senderInfo.email} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-white">{senderInfo.name}</span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-200 truncate">{formattedEmail.subject}</p>
              <p className="text-xs text-gray-400 truncate">{getPreviewText(formattedEmail.content)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(formattedEmail.id, e);
              }}
              className="p-1"
            >
              {formattedEmail.starred ? 
                <MdStar className="w-5 h-5 text-yellow-400" /> : 
                <MdStarBorder className="w-5 h-5 text-gray-400" />
              }
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div 
          className="hidden md:flex items-center px-4 py-3 cursor-pointer gap-4"
          onClick={(e) => onClick(e, formattedEmail)}
        >
          <div className="flex items-center gap-3 w-[240px] flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEmailSelection(formattedEmail.id, e);
                }}
                className="p-1"
              >
                {selectedEmails.includes(formattedEmail.id) ? 
                  <MdCheckBox className="w-5 h-5 text-blue-500" /> : 
                  <MdCheckBoxOutlineBlank className="w-5 h-5 text-gray-400" />
                }
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(formattedEmail.id, e);
                }}
                className="p-1"
              >
                {formattedEmail.starred ? 
                  <MdStar className="w-5 h-5 text-yellow-400" /> : 
                  <MdStarBorder className="w-5 h-5 text-gray-400" />
                }
              </button>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={senderInfo.name} email={senderInfo.email} />
              <span className="font-medium text-sm truncate text-blue-300">
                {senderInfo.name}
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 min-w-0 pr-4">
            <div className="flex-1 flex flex-col min-w-0">
              <p className={`text-sm ${!formattedEmail.read ? 'font-semibold text-white' : 'text-gray-300'} truncate`}>
                {formattedEmail.subject}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {getPreviewText(formattedEmail.content)}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <TagBadge tag={messageTag} />
              <div className="hidden group-hover:flex items-center gap-1">
                <button className="p-2 hover:bg-white/10 rounded-full" title="Archive">
                  <MdArchive className="w-5 h-5 text-gray-300" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full" title="Delete">
                  <MdDelete className="w-5 h-5 text-gray-300" />
                </button>
              </div>
              <span className="text-sm text-gray-400 w-20 text-right">
                {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
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
  const seenMessages = React.useRef(new Set());

  // Reset seen messages when emails change
  useEffect(() => {
    seenMessages.current.clear();
  }, [emails]);

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
      .filter(email => {
        const messageKey = email.id || email.messageId || email.date?.toString();
        if (seenMessages.current.has(messageKey)) {
          return false;
        }
        seenMessages.current.add(messageKey);
        return true;
      })
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
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    setSelectedEmail(email);
  }, []);

  const handleCloseDetail = useCallback(() => {
    document.body.style.overflow = ''; // Restore scrolling
    setSelectedEmail(null);
  }, []);

  useEffect(() => {
    // Optionally refresh on mount
    handleRefresh();
  }, [handleRefresh]);

  const renderEmailItem = useCallback(({ index, style }) => {
  }, []);

  return (
    <div className="h-full flex flex-col relative">
      {initialLoading || fetchLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex justify-center items-center"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </motion.div>
      ) : !Array.isArray(emails) || emails.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-gray-500"
        >
          <div className="text-xl mb-2">No emails found</div>
          <div className="text-sm">Your {type} is empty</div>
        </motion.div>
      ) : !isClient ? (
        <div className="flex-1 overflow-y-auto overscroll-contain">
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
      ) : (
        <div className="flex-1 relative">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={memoizedValue.length}
                itemSize={type === 'mobile' ? 96 : 76} // Increased heights
                overscanCount={5}
                className="px-2 py-1"
              >
                {({ index, style }) => (
                  <div style={style}>
                    <EmailItem
                      key={generateUniqueKey(memoizedValue[index])}
                      email={memoizedValue[index]}
                      type={type}
                      selectedEmails={selectedEmails}
                      toggleEmailSelection={toggleEmailSelection}
                      toggleStar={toggleStar}
                      onClick={handleEmailClick}
                      showAll={showAll}
                    />
                  </div>
                )}
              </List>
            )}
          </AutoSizer>
        </div>
      )}

      {selectedEmail && (
        <div className="fixed inset-0 z-[9999] md:relative">
          <EmailDetail 
            email={selectedEmail}
            onClose={handleCloseDetail}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(EmailList);