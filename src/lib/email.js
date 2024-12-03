import { connect } from '../lib/dbConfig';
import User from '../models/User';
import { fetchEmailsIMAP, sendEmailSMTP } from '../utils/emailService';
import { cache, clearCacheByPattern, getCacheKey, clearCacheByKey } from '../utils/cache';

const serializeDate = (date) => {
  if (!date) return null;
  return date instanceof Date ? date.toISOString() : date;
};

const serializeMessage = (message) => {
  if (!message) return null;
  return {
    id: message._id?.toString(),
    content: message.content,
    createdAt: serializeDate(message.createdAt),
    read: message.read,
    attachments: message.attachments || [],
    externalSender: message.externalSender,
    externalId: message.externalId,
    from: message.from ? {
      id: message.from._id?.toString(),
      name: message.from.name,
      email: message.from.email
    } : null
  };
};

const serializeEmail = (email) => {
  if (!email) return null;
  return {
    id: email._id?.toString(),
    conversationId: email.conversationId,
    subject: email.subject,
    status: email.status,
    toEmail: email.toEmail,
    lastMessageAt: serializeDate(email.lastMessageAt),
    participants: email.participants?.map(p => ({
      id: p._id?.toString(),
      name: p.name,
      email: p.email
    })) || [],
    messages: (email.messages || []).map(msg => serializeMessage(msg)).filter(Boolean)
  };
};

export const getInboxEmails = async (userId, forceRefresh = false) => {
  try {
    await connect();
    
    const user = await User.findById(userId)
      .select('+emailConfig.smtp.password +emailConfig.imap.password');
    
    if (!user?.emailConfig?.imap?.host || !user?.emailConfig?.smtp?.host) {
      console.log('Email not configured for user:', userId);
      return { 
        success: false,
        emails: [], 
        pagination: {
          total: 0,
          pages: 0,
          current: 1
        },
        error: 'EMAIL_NOT_CONFIGURED'
      };
    }
    
    const cacheKey = getCacheKey(userId, 'inbox', 1, 50);  // Ensure consistent limit
    console.log('🔍 Checking cache for:', cacheKey);
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✨ Returning cached emails for:', cacheKey);
        return { ...cached, cached: true };
      }
    }

    console.log('🔄 Fetching fresh emails from mail server');
    const result = await fetchEmailsIMAP(user, 'inbox', 1, 50);

    if (result.success) {
      console.log('💾 Caching emails with key:', cacheKey);
      cache.set(cacheKey, result, 300); // 5 minute TTL
    }

    return { ...result, cached: false };
  } catch (error) {
    console.error('❌ Error in getInboxEmails:', error);
    return { 
      success: false,
      emails: [], 
      pagination: {
        total: 0,
        pages: 0,
        current: 1
      },
      error: error.message
    };
  }
};

export const getSentEmails = async (userId) => {
  try {
    await connect(); // Ensure DB connection first

    const result = await getEmails(userId, { 
      folder: 'sent',
      page: 1,
      limit: 50 
    });
    return {
      emails: result.emails.map(serializeEmail),
      pagination: result.pagination || {}
    };
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    return { emails: [], pagination: {} };
  }
};

export async function sendEmail({ from, to, subject, content, userConfig }) {
  if (!userConfig) {
    throw new Error('Email configuration is required');
  }

  await connect();
  return sendEmailSMTP({ 
    from, 
    to, 
    subject, 
    content, 
    userConfig 
  });
}