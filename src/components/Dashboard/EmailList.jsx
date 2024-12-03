"use client"
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  if (type === 'inbox') {
    if (email.messages?.[0]?.externalSender) {
      const sender = email.messages[0].externalSender;
      return {
        name: sender.split('@')[0],
        email: sender
      };
    }
    return email.participants?.[0] || { name: 'Unknown', email: 'unknown@example.com' };
  }
  return email.participants?.[1] || { name: email.toEmail, email: email.toEmail };
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

const EmailItem = React.memo(function EmailItem({ email, type, selectedEmails, toggleEmailSelection, toggleStar, itemVariants, onClick }) {
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
            <motion.span 
              className={`font-medium ${!email.read ? 'font-semibold' : ''}`}
              whileHover={{ scale: 1.02 }}
            >
              {sender.name}
            </motion.span>
            <motion.span 
              className="text-sm text-gray-500"
              whileHover={{ scale: 1.02 }}
            >
              {messageDate ? getFormattedDate(messageDate) : 'Unknown date'}
            </motion.span>
          </div>
          <h3 className="text-sm font-medium text-gray-800 mb-1">
            {email.subject}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {getPreviewText(lastMessage.content)}...
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

const EmailList = ({ emails, type, selectedEmails, setSelectedEmails, itemVariants }) => {
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
        {emails.map((email) => (
          <EmailItem
            key={email.id || email.messageId || email.uid || Math.random().toString()}
            email={email}
            type={type}
            selectedEmails={selectedEmails}
            toggleEmailSelection={toggleEmailSelection}
            toggleStar={toggleStar}
            itemVariants={itemVariants}
            onClick={handleEmailClick}
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