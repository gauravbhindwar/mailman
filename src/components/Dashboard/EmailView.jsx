import { MdReply, MdForward, MdArchive, MdDelete, MdMoreVert } from 'react-icons/md';
import { simpleParser } from 'mailparser';
import { useState, useEffect } from 'react';

const parseMIMEContent = async (content) => {
  try {
    // Handle content that might be an object
    if (typeof content === 'object') {
      return {
        htmlContent: content.html || '',
        plainText: content.text || '',
        attachments: content.attachments || []
      };
    }

    // Convert string to Buffer only if content is a string
    if (typeof content === 'string') {
      const buffer = Buffer.from(content);
      const parsed = await simpleParser(buffer);
      
      return {
        htmlContent: parsed.html,
        plainText: parsed.text,
        attachments: parsed.attachments
      };
    }

    // Fallback for invalid content
    return {
      htmlContent: '',
      plainText: 'Unable to parse email content',
      attachments: []
    };
  } catch (error) {
    console.error('MIME parsing error:', error);
    return {
      htmlContent: '',
      plainText: String(content) || 'Unable to parse email content',
      attachments: []
    };
  }
};

export default function EmailView({ email }) {
  if (!email) return <div className="p-4">Email not found</div>;

  const [emailContent, setEmailContent] = useState({
    htmlContent: '',
    plainText: '',
    attachments: []
  });

  useEffect(() => {
    if (email?.content) {
      parseMIMEContent(email.content)
        .then(setEmailContent)
        .catch(err => {
          console.error('Failed to parse email content:', err);
          setEmailContent({
            htmlContent: '',
            plainText: 'Failed to load email content',
            attachments: []
          });
        });
    }
  }, [email]);

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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Email Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{email.subject}</h2>
          <div className="flex space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MdArchive className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MdDelete className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MdReply className="w-5 h-5" />
            <span>Reply</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MdForward className="w-5 h-5" />
            <span>Forward</span>
          </button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="prose max-w-none space-y-6">
          {emailContent.htmlContent ? (
            <div 
              className="text-gray-800 email-content"
              dangerouslySetInnerHTML={{ __html: emailContent.htmlContent }}
            />
          ) : (
            <div className="text-gray-800 whitespace-pre-wrap text-base">
              {emailContent.plainText}
            </div>
          )}

          {/* Attachments */}
          {emailContent.attachments?.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {emailContent.attachments.map((attachment, index) => (
                  <div 
                    key={index}
                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm flex items-center gap-2"
                  >
                    <span>{attachment.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .email-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
        }
        .email-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .email-content img {
          max-width: 100%;
          height: auto;
        }
        .email-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .email-content td, .email-content th {
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}