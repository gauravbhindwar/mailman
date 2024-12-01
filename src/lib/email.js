import { connect } from '../lib/dbConfig';
import { fetchAndStoreExternalEmails, getEmails, sendEmail as sendEmailService } from '../utils/emailService';

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

export const getInboxEmails = async (userId) => {
  try {
    await connect(); // Ensure DB connection first
    
    // Fetch external emails
    const externalResult = await fetchAndStoreExternalEmails(userId);
    console.log('External emails fetched:', externalResult.success);

    // Get all emails including external ones
    const result = await getEmails(userId, { 
      folder: 'inbox',
      page: 1,
      limit: 50 
    });

    return {
      emails: (result.emails || []).map(email => serializeEmail(email)).filter(Boolean),
      pagination: result.pagination || {}
    };
  } catch (error) {
    console.error('Error fetching inbox emails:', error);
    return { 
      emails: [], 
      pagination: {},
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