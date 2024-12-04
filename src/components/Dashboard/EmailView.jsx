import { MdReply, MdForward, MdArchive, MdDelete, MdMoreVert } from 'react-icons/md';
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

// Keep only essential helper functions
const getInitials = (name) => {
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
  return colors[str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length];
};

const sanitizeHtml = (html) => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'i', 'img', 'li', 'ol', 'p',
      'span', 'strong', 'table', 'tbody', 'td', 'th',
      'thead', 'tr', 'ul'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'style', 'class', 'target'
    ]
  });
};

const extractContent = (message) => {
  if (!message) return '';
  
  // Handle different content formats
  if (typeof message === 'string') return message;
  
  // If message is the content object itself
  if (message.html || message.text) {
    return message.html || message.text;
  }
  
  // If content is nested in content property
  if (message.content) {
    if (typeof message.content === 'string') return message.content;
    return message.content.html || message.content.text || '';
  }
  
  // If content is in body property
  if (message.body) {
    if (typeof message.body === 'string') return message.body;
    return message.body.html || message.body.text || '';
  }
  
  return '';
};

export default function EmailView({ email }) {
  if (!email) return <div className="p-4">Email not found</div>;

  const content = extractContent(email);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Email Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{email.subject}</h2>
          <div className="flex space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MdArchive className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MdDelete className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MdMoreVert className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${getRandomColor(email.from)}`}>
            {getInitials(email.from.split('<')[0].trim())}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{email.from}</p>
                <p className="text-sm text-gray-600">To: {email.to}</p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(email.date).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100">
            <MdReply className="w-5 h-5" />
            <span>Reply</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100">
            <MdForward className="w-5 h-5" />
            <span>Forward</span>
          </button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: sanitizeHtml(content)
          }}
        />
      </div>

      <style jsx global>{`
        .prose {
          max-width: none;
          color: #24292e;
          line-height: 1.6;
        }
        .prose img {
          max-width: 100%;
          height: auto;
        }
        .prose a {
          color: #0366d6;
          text-decoration: none;
        }
        .prose a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}