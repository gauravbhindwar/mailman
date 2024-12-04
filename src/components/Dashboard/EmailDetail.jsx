"use client"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { MdReply, MdForward, MdDelete, MdArchive, MdClose, MdStar, MdLabel, MdSchedule, MdMoreVert, MdPrint, MdAttachment, MdOpenInNew } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';

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

const sanitizeHtml = (html) => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'i', 'img', 'li', 'ol', 'p',
      'span', 'strong', 'table', 'tbody', 'td', 'th',
      'thead', 'tr', 'ul', 'video', 'source', 'iframe',
      'blockquote', 'pre', 'code', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'style', 'class', 'target',
      'width', 'height', 'controls', 'poster', 'type',
      'frameborder', 'allowfullscreen', 'title', 'aria-label', 'role', 'data-*'
    ],
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'allowfullscreen', 'frameborder'],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    SANITIZE_DOM: true
  });
};

const formatContent = (content) => {
  if (!content) return '';
  
  if (typeof content === 'object') {
    return content.html || content.text || '';
  }
  
  return content;
};

const cleanEmailContent = (content) => {
  if (!content) return '';

  return content
    // Remove email client markers
    .replace(/(-{2,}[0-9a-f]*)/gi, '')
    // Clean forwarded message headers
    .replace(/(-{3,}.*?Forwarded message.*?-{3,})/gi, '<div class="forwarded-header">Forwarded message</div>')
    // Format email headers
    .replace(/(From|To|Date|Subject):\s*([^\n]+)/gi, '<div class="email-header"><strong>$1:</strong> $2</div>')
    // Remove content encoding markers
    .replace(/Content-(Type|Transfer-Encoding):[^\n]+/gi, '')
    // Clean up extra spaces and newlines
    .replace(/\s*\n\s*\n\s*/g, '\n\n')
    .trim();
};

const formatEmailDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateStr || 'Unknown Date';
  }
};

const EmailHeader = ({ email, onClose, onReply, onForward }) => (
  <div className="p-6 border-b bg-white sticky top-0 z-10 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1 pr-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {email.subject}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">
            {email.folder || 'Inbox'}
          </span>
          {email.labels?.map(label => (
            <span key={label} className="bg-blue-50 text-blue-600 px-2 py-1 rounded">
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-full" title="Print">
          <MdPrint className="w-5 h-5 text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full" title="Open in new window">
          <MdOpenInNew className="w-5 h-5 text-gray-600" />
        </button>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <MdClose className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {[email.from, email.to].map((addr, i) => (
            <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white">
              {addr?.charAt(0)?.toUpperCase()}
            </div>
          ))}
        </div>
        <div>
          <div className="font-medium text-gray-900">
            {email.from}
            <span className="text-gray-400 mx-2">→</span>
            {email.to}
          </div>
          <div className="text-sm text-gray-500">
            {new Date(email.date).toLocaleString()} ({formatDistanceToNow(new Date(email.date), { addSuffix: true })})
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="icon-button" title="Star">
          <MdStar className="w-5 h-5" />
        </button>
        <button className="icon-button" title="Label">
          <MdLabel className="w-5 h-5" />
        </button>
        <button className="icon-button" title="More">
          <MdMoreVert className="w-5 h-5" />
        </button>
      </div>
    </div>

    <div className="flex gap-2 mt-4">
      <button className="action-button primary" onClick={onReply}>
        <MdReply className="w-5 h-5" />
        Reply
      </button>
      <button className="action-button" onClick={onForward}>
        <MdForward className="w-5 h-5" />
        Forward
      </button>
      <button className="action-button">
        <MdArchive className="w-5 h-5" />
        Archive
      </button>
      <button className="action-button danger">
        <MdDelete className="w-5 h-5" />
        Delete
      </button>
    </div>
  </div>
);

const AttachmentPreview = ({ attachment }) => (
  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
    <MdAttachment className="w-5 h-5 text-gray-500" />
    <span className="text-sm text-gray-600">{attachment.filename}</span>
    <span className="text-xs text-gray-400">
      {(attachment.size / 1024).toFixed(1)}KB
    </span>
  </div>
);

const extractContent = (message) => {
  if (!message) return '';
  
  // If message is a string, return it directly
  if (typeof message === 'string') return message;
  
  // If message has content property that's a string
  if (typeof message.content === 'string') return message.content;
  
  // If message has content as an object
  if (message.content?.html || message.content?.text) {
    return message.content.html || message.content.text;
  }
  
  // If message is already in html/text format
  if (message.html || message.text) {
    return message.html || message.text;
  }
  
  // Try to get content from body
  if (message.body) {
    return typeof message.body === 'string' ? message.body : message.body.html || message.body.text || '';
  }
  
  return '';
};

const MessageThread = ({ messages = [], participants = [] }) => (
  <div className="space-y-4 p-6">
    {Array.isArray(messages) && messages.length > 0 ? messages.map((message, index) => {
      const messageContent = extractContent(message);
      const sender = message.from || message.externalSender || 'Unknown Sender';
      const timestamp = message.date || message.createdAt || new Date();
      const attachments = Array.isArray(message.attachments) ? message.attachments : [];

      // Clean up email content
      const cleanedContent = sanitizeHtml(cleanEmailContent(messageContent));
      
      return (
        <div key={`message-${index}-${timestamp}`} 
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        >
          {/* Gmail-like header */}
          <div className="p-4 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {(typeof sender === 'string' ? sender[0] : '?').toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{sender}</span>
                    <span className="text-xs text-gray-500">
                      {`<${message.from}>`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    to {message.to}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                </span>
                <div className="hidden group-hover:flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MdStar className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MdReply className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MdMoreVert className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Email content with Gmail-like styling */}
          <div className="px-16 py-6">
            <div className="prose prose-sm max-w-none">
              <div
                className="message-content text-gray-800"
                dangerouslySetInnerHTML={{ 
                  __html: cleanedContent
                }}
              />
            </div>

            {/* Gmail-like attachments */}
            {attachments.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {attachments.map((attachment, i) => (
                    <div 
                      key={i}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <MdAttachment className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {attachment.filename}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {Math.round(attachment.size / 1024)} KB
                        </span>
                        <button className="text-blue-600 text-sm hover:text-blue-700">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick reply area (Gmail-like) */}
          <div className="px-16 pb-6">
            <div className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-text">
              <div className="text-gray-600 text-sm">Click here to reply</div>
            </div>
          </div>
        </div>
      );
    }) : (
      <div className="text-center text-gray-500 py-4">
        No message content available
      </div>
    )}
  </div>
);

// Update EmailStyles with Gmail-like styling
const EmailStyles = () => (
  <style jsx global>{`
    .message-content {
      font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #202124;
    }
    
    .message-content p {
      margin: 1em 0;
    }

    .message-content a {
      color: #1a73e8;
      text-decoration: none;
    }

    .message-content a:hover {
      text-decoration: underline;
    }

    .message-content blockquote {
      margin: 1em 0;
      padding-left: 1em;
      border-left: 2px solid #dadce0;
      color: #5f6368;
    }

    .forwarded-header {
      color: #5f6368;
      font-size: 0.875rem;
      margin: 1em 0;
      padding: 0.5em;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .message-content {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
    }
    
    .message-content img {
      max-width: 100%;
      height: auto;
      display: inline-block;
      margin: 1rem 0;
      border-radius: 0.375rem;
    }

    .message-content table {
      width: 100%;
      margin: 1rem 0;
      border-collapse: collapse;
    }

    .message-content td {
      padding: 0.5rem;
      vertical-align: top;
    }

    .message-content a {
      color: #3b82f6;
      text-decoration: none;
    }

    .message-content a:hover {
      text-decoration: underline;
    }

    .message-content hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 1.5rem 0;
    }

    .message-content [data-marker] {
      display: none;
    }

    /* Hide email markers and separators */
    .message-content pre,
    .message-content .email-separator,
    .message-content .email-header {
      display: none;
    }

    /* Improve text readability */
    .message-content p {
      margin: 0.75rem 0;
    }

    /* Fix list alignment */
    .message-content ul,
    .message-content ol {
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }

    /* Remove extra spacing from divs */
    .message-content > div:empty {
      display: none;
    }

    /* Email specific styles */
    .forwarded-header {
      background: #f3f4f6;
      color: #4b5563;
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      border-left: 4px solid #9ca3af;
      font-weight: 500;
    }

    .email-header {
      color: #4b5563;
      padding: 0.25rem 0;
      font-size: 0.875rem;
    }

    .email-header strong {
      color: #374151;
      display: inline-block;
      width: 4rem;
    }

    .message-content {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: #1f2937;
    }

    .message-content > div {
      margin: 0.5rem 0;
    }

    .message-content blockquote {
      border-left: 3px solid #e5e7eb;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #6b7280;
      font-style: italic;
    }

    /* Quoted text styles */
    .message-content .quoted-text {
      color: #6b7280;
      font-size: 0.875rem;
      padding-left: 1rem;
      border-left: 2px solid #e5e7eb;
      margin: 1rem 0;
    }

    /* Mobile optimization */
    @media (max-width: 640px) {
      .message-content {
        font-size: 0.875rem;
      }
      
      .email-header {
        font-size: 0.8125rem;
      }
    }
  `}</style>
);

export default function EmailDetail({ email, onClose }) {
  const router = useRouter();
  
  // Remove the isReplying and isForwarding states since we're not using ReplyForm anymore
  
  if (!email) return null;

  // Format email data with comprehensive fallbacks
  const formattedEmail = {
    subject: email.subject || 'No Subject',
    content: extractContent(email),
    messages: Array.isArray(email.messages) ? email.messages : [{
      content: extractContent(email),
      from: email.from,
      to: email.to,
      date: email.date,
      id: email.id,
      attachments: email.attachments || []
    }],
    participants: Array.isArray(email.participants) ? email.participants : [],
    from: email.from || 'Unknown Sender',
    to: email.to || '',
    date: email.date || new Date(),
    folder: email.folder || 'inbox',
    labels: Array.isArray(email.labels) ? email.labels : []
  };

  const handleReply = () => {
    const originalMessage = email.messages?.[0];
    const replyData = {
      to: originalMessage?.from || email.from,
      subject: `Re: ${email.subject}`,
      content: `
        <br/>
        <div class="quoted-text">
          On ${formatEmailDate(originalMessage?.date || email.date)}, ${originalMessage?.from || email.from} wrote:
          <br/><br/>
          ${sanitizeHtml(originalMessage?.content || email.content)}
        </div>
      `.trim()
    };
    
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(replyData))));
    router.push(`/dashboard/compose?reply=${encodedData}`);
    onClose();
  };

  const handleForward = () => {
    const originalMessage = email.messages?.[0];
    const forwardData = {
      subject: `Fwd: ${email.subject}`,
      content: `
        <div class="forwarded-header">---------- Forwarded message ----------</div>
        <div class="email-header"><strong>From:</strong> ${originalMessage?.from || email.from}</div>
        <div class="email-header"><strong>Date:</strong> ${formatEmailDate(originalMessage?.date || email.date)}</div>
        <div class="email-header"><strong>Subject:</strong> ${email.subject}</div>
        <div class="email-header"><strong>To:</strong> ${originalMessage?.to || email.to}</div>
        <br/>
        ${sanitizeHtml(originalMessage?.content || email.content)}
      `.trim()
    };
    
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(forwardData))));
    router.push(`/dashboard/compose?forward=${encodedData}`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex justify-center items-start overflow-y-auto p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        variants={modalAnimation}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-4xl my-8"
      >
        <EmailHeader 
          email={formattedEmail} 
          onClose={onClose}
          onReply={handleReply}
          onForward={handleForward}
        />
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <MessageThread 
            messages={formattedEmail.messages} 
            participants={formattedEmail.participants} 
          />
        </div>

        {/* Remove ReplyForm components and AnimatePresence */}

        <EmailStyles />
      </motion.div>
    </motion.div>
  );
}