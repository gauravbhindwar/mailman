import { connect } from '../lib/dbConfig';
import User from '../models/User';
import { fetchAndStoreExternalEmails, getEmails, sendEmail as sendEmailService } from '../utils/emailService';
import { cache, clearCacheByPattern, getCacheKey } from '../utils/cache';

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
    
    if (forceRefresh) {
      console.log('Forcing refresh of external emails');
      await clearCacheByPattern(`emails:${userId}`);
      await fetchAndStoreExternalEmails(userId);
    }

    // Get emails from database
    const result = await getEmails(userId, { 
      folder: 'inbox',
      page: 1,
      limit: 50 
    });

    return {
      success: true,
      emails: result.emails || [],
      pagination: result.pagination || {}
    };
  } catch (error) {
    console.error('Error in getInboxEmails:', error);
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

export async function sendEmail(emailData) {
  await connect(); // Ensure DB connection first
  return sendEmailService(emailData);
}