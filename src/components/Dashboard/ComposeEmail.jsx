'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdSend, MdAttachFile, MdDelete, MdMinimize, MdOpenInFull } from 'react-icons/md';
import TextEditor from '../TextEditor';

export default function ComposeEmail() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    content: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const replyData = searchParams.get('reply');
    const forwardData = searchParams.get('forward');

    if (replyData) {
      try {
        // Use atob to decode base64
        const decoded = JSON.parse(atob(replyData));
        setEmailData({
          to: decoded.to || '',
          subject: decoded.subject || '',
          content: decoded.content || ''
        });
      } catch (error) {
        console.error('Error parsing reply data:', error);
        setError('Invalid reply data');
      }
    }

    if (forwardData) {
      try {
        // Use atob to decode base64
        const decoded = JSON.parse(atob(forwardData));
        setEmailData({
          to: '', // Forward requires manual input of recipient
          subject: decoded.subject || '',
          content: decoded.content || ''
        });
      } catch (error) {
        console.error('Error parsing forward data:', error);
        setError('Invalid forward data');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: { userId: session.user.id, email: session.user.email }, // Use logged-in user's ID and email
          ...emailData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      router.push('/dashboard/sent');
    } catch (error) {
      setError(error.message);
      console.error('Failed to send email:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const slideUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={slideUpVariants}
      className={`backdrop-blur-xl bg-white/95 ${
        isFullscreen 
          ? 'fixed inset-0 z-50' 
          : 'rounded-2xl max-w-4xl mx-auto my-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
      }`}
    >
      <motion.div 
        className="flex justify-between items-center p-6 bg-gradient-to-r from-gray-50/50 to-white/50"
      >
        <motion.h2 
          className="text-xl font-semibold text-gray-800"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          New Message
        </motion.h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2.5 hover:bg-gray-100/80 rounded-xl transition-colors"
          >
            <MdMinimize size={20} className="text-gray-600" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <MdOpenInFull size={18} className="text-gray-600" />
          </button>
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Close"
          >
            <MdClose size={18} className="text-gray-600" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="p-8 flex flex-col h-full space-y-8">
        <motion.div className="space-y-6">
          <motion.div className="flex items-center gap-4 group">
            <span className="text-gray-400 min-w-[4rem] text-sm font-medium">To</span>
            <input
              type="email"
              value={emailData.to}
              onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
              className="flex-1 px-4 py-3 outline-none bg-gray-50/50 rounded-xl
                focus:bg-gray-50/80 focus:ring-1 focus:ring-blue-200
                transition-all duration-300"
              required
              placeholder="recipient@example.com"
            />
          </motion.div>

          <motion.div className="flex items-center gap-4 group">
            <span className="text-gray-400 min-w-[4rem] text-sm font-medium">Subject</span>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="flex-1 px-4 py-3 outline-none bg-gray-50/50 rounded-xl
                focus:bg-gray-50/80 focus:ring-1 focus:ring-blue-200
                transition-all duration-300"
              required
              placeholder="Email subject"
            />
          </motion.div>
        </motion.div>

        <motion.div 
          className={`flex-1 transition-all duration-300 ${
            isDragging 
              ? 'ring-2 ring-blue-400 scale-[1.01]' 
              : 'ring-1 ring-gray-100'
          } rounded-2xl overflow-hidden bg-gray-50/50`}
          whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <TextEditor
            value={emailData.content}
            onChange={(content) => setEmailData({ ...emailData, content })}
            placeholder="Write your message here..."
          />
        </motion.div>

        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6"
            >
              <h3 className="text-xs font-semibold text-gray-500 mb-3">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border text-sm hover:bg-gray-100 transition-colors"
                  >
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="flex items-center justify-between pt-6">
          <motion.div whileHover={{ scale: 1.02 }}>
            <input
              type="file"
              id="file-input"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <label 
              htmlFor="file-input"
              className="flex items-center gap-2 px-6 py-3 text-gray-600
                bg-gray-50/80 hover:bg-gray-100/80 rounded-xl cursor-pointer 
                text-sm font-medium transition-all duration-300"
            >
              <MdAttachFile size={20} />
              <span>Attach files</span>
            </label>
          </motion.div>
          
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-8 py-3
              bg-blue-600 text-white rounded-xl
              font-medium transition-all duration-300
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <MdSend size={20} className={isSubmitting ? 'animate-pulse' : ''} />
            {isSubmitting ? 'Sending...' : 'Send'}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
}