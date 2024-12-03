"use client"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { MdReply, MdForward, MdDelete, MdArchive, MdClose } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import EmailView from './EmailView';

// Dynamic import of the rich text editor
const RichTextEditor = dynamic(() => import('../RichTextEditor'), { ssr: false });

const modalAnimation = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { 
      duration: 0.2 
    }
  }
};

const MessageThread = ({ messages = [], participants = [] }) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No messages to display
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {messages.map((message, index) => {
        if (!message) return null;
        
        const messageKey = `${message.id || message._id || message.externalId || Date.now()}-${index}`;
        const senderName = message.externalSender || 
          participants?.find(p => p?.id === message?.from?.id)?.name || 
          'Unknown Sender';
        const senderInitial = (senderName?.[0] || '?').toUpperCase();
        
        return (
          <motion.div
            key={messageKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                message.externalSender ? 'bg-purple-500' : 'bg-blue-500'
              }`}>
                {senderInitial}
              </div>
              <div>
                <div className="font-medium">{senderName}</div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(message.createdAt || Date.now()), { addSuffix: true })}
                </div>
              </div>
            </div>
            <div className="pl-11">
              {message.content ? (
                <div dangerouslySetInnerHTML={{ __html: message.content }} />
              ) : (
                <p className="text-gray-500 italic">No content</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

const ReplyForm = ({ onSubmit, onCancel, initialContent = '', isForward = false }) => {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="border-t mt-4 p-4 bg-white">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-medium">{isForward ? 'Forward Email' : 'Reply'}</h3>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <MdClose size={20} />
        </button>
      </div>
      
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder={isForward ? "Add a message (optional)" : "Type your reply..."}
      />

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(content)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isForward ? 'Forward' : 'Send Reply'}
        </button>
      </div>
    </div>
  );
};

export default function EmailDetail({ email, onClose }) {
  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                <EmailView email={email} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
