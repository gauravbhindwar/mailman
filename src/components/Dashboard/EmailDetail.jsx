"use client"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { MdReply, MdForward, MdDelete, MdArchive, MdClose } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

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

const MessageThread = ({ messages, participants }) => {
  return (
    <motion.div 
      className="space-y-6 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {messages.map((message, index) => (
        <motion.div
          key={`${message.id || message._id || message.externalId || Date.now()}-${message.createdAt}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              message.externalSender ? 'bg-purple-500' : 'bg-blue-500'
            }`}>
              {message.externalSender ? 
                message.externalSender[0].toUpperCase() :
                participants.find(p => p.id === message.from?.id)?.name[0]
              }
            </div>
            <div>
              <div className="font-medium">
                {message.externalSender || 
                  participants.find(p => p.id === message.from?.id)?.name
                }
              </div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
          <div className="pl-11" dangerouslySetInnerHTML={{ __html: message.content }} />
        </motion.div>
      ))}
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
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);

  const handleReply = () => {
    const replyData = {
      to: email.messages?.[0]?.externalSender || email.participants?.[0]?.email,
      subject: `Re: ${email.subject}`,
      content: `\n\nOn ${new Date(email.messages?.[0]?.createdAt).toLocaleString()}, ${email.messages?.[0]?.externalSender || email.participants?.[0]?.email} wrote:\n${email.messages?.[0]?.content?.replace(/(<([^>]+)>)/gi, '') || ''}`
    };
    
    // Use btoa for base64 encoding instead of URI encoding
    const queryParams = btoa(JSON.stringify(replyData));
    router.push(`/dashboard/compose?reply=${queryParams}`);
    onClose();
  };

  const handleForward = () => {
    const forwardData = {
      subject: `Fwd: ${email.subject}`,
      content: `---------- Forwarded message ----------\n` +
        `From: ${email.messages?.[0]?.externalSender || email.participants?.[0]?.email}\n` +
        `Date: ${new Date(email.messages?.[0]?.createdAt).toLocaleString()}\n` +
        `Subject: ${email.subject}\n\n` +
        `${email.messages?.[0]?.content?.replace(/(<([^>]+)>)/gi, '') || ''}`
    };
    
    // Use btoa for base64 encoding
    const queryParams = btoa(JSON.stringify(forwardData));
    router.push(`/dashboard/compose?forward=${queryParams}`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-center items-start overflow-y-auto p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        variants={modalAnimation}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Email Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">{email.subject}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <MdClose size={24} />
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReply}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:bg-gray-100"
            >
              <MdReply /> Reply
            </button>
            <button
              onClick={handleForward}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:bg-gray-100"
            >
              <MdForward /> Forward
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:bg-gray-100">
              <MdArchive /> Archive
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:bg-gray-100">
              <MdDelete /> Delete
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <MessageThread messages={email.messages} participants={email.participants} />
        </div>

        {/* Reply/Forward Forms */}
        <AnimatePresence>
          {isReplying && (
            <ReplyForm
              onSubmit={handleReply}
              onCancel={() => setIsReplying(false)}
            />
          )}
          {isForwarding && (
            <ReplyForm
              onSubmit={handleForward}
              onCancel={() => setIsForwarding(false)}
              initialContent={`
                <br/><br/>
                ---------- Forwarded message ----------<br/>
                From: ${email.participants[0].name} <${email.participants[0].email}><br/>
                Date: ${new Date(email.messages[0].createdAt).toLocaleString()}<br/>
                Subject: ${email.subject}<br/>
                To: ${email.participants[1].email}<br/>
                <br/>
                ${email.messages[0].content}
              `}
              isForward={true}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
