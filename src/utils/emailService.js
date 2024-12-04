import Email from '../models/Email';
import User from '../models/User';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { decrypt } from './encryption';
import { connect } from '../lib/dbConfig';
import { generateConversationId } from './emailUtils';
import NodeCache from 'node-cache';
import { cache, getCacheKey } from './cache';
import { validateSMTPConfig } from './email-config';

// Remove the local emailCache declaration since we're using the shared one

// Initialize cache with 5 minute TTL

// Add connection pool
const imapConnectionPool = new Map();
const MAX_RETRIES = 3;

// Add this at the top with other constants
const GMAIL_IMAP_CONFIG = {
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  authTimeout: 30000,
  connTimeout: 30000,
  tlsOptions: { rejectUnauthorized: false }
};

const SPECIAL_USE_ATTRIBUTES = {
  '\\All': 'all',
  '\\Drafts': 'drafts',
  '\\Important': 'important',
  '\\Sent': 'sent',
  '\\Junk': 'spam',
  '\\Flagged': 'starred',
  '\\Trash': 'trash'
};

const getFolderMapping = (boxes) => {
  const mapping = {};
  const traverseBoxes = (box, path = '') => {
    Object.keys(box).forEach((key) => {
      const fullPath = path ? `${path}/${key}` : key;
      const boxInfo = box[key];
      if (boxInfo.children) {
        traverseBoxes(boxInfo.children, fullPath);
      } else {
        const attributes = boxInfo.attribs || [];
        attributes.forEach((attr) => {
          if (SPECIAL_USE_ATTRIBUTES[attr]) {
            mapping[SPECIAL_USE_ATTRIBUTES[attr]] = fullPath;
          }
        });
      }
    });
  };
  traverseBoxes(boxes);
  return mapping;
};

// Email validation
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Create dynamic SMTP transporter with Gmail defaults
const createSMTPTransport = (userConfig) => {
  validateSMTPConfig(userConfig);
  const { host, port, user, password, secure = true, requireTLS = true } = userConfig.smtp;

  const transportConfig = {
    host,
    port: parseInt(port),
    secure, // Use secure for port 465, false for other ports
    auth: {
      user,
      pass: password,
    },
    requireTLS,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  };

  // Special handling for different ports
  if (port === 587) {
    transportConfig.secure = false;
    transportConfig.requireTLS = true;
  }

  return nodemailer.createTransport(transportConfig);
};

// Create SMTP transporter for verification emails
const createVerificationTransport = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ROOT_EMAIL,
      pass: process.env.ROOT_EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Send email using SMTP configuration
export const sendEmailSMTP = async ({ from, to, subject, content, attachments = [], userConfig }) => {
  if (!userConfig?.smtp) {
    throw new Error('SMTP configuration is missing. Please configure your email settings.');
  }

  const { host, port, user, password } = userConfig.smtp;
  
  if (!host || !port || !user || !password) {
    const missing = [];
    if (!host) missing.push('SMTP Host');
    if (!port) missing.push('SMTP Port');
    if (!user) missing.push('SMTP Username');
    if (!password) missing.push('SMTP Password');
    throw new Error(`Incomplete SMTP configuration. Missing: ${missing.join(', ')}`);
  }

  try {
    await connect();
    
    const transporter = createSMTPTransport(userConfig);
    
    // Verify SMTP connection with detailed error handling
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP Verification Error:', {
        error: verifyError,
        config: {
          host: userConfig.smtp.host,
          port: userConfig.smtp.port,
          secure: userConfig.smtp.secure,
          user: userConfig.smtp.user
        }
      });
      throw new Error(
        `SMTP connection failed: ${verifyError.message}. Please check your email settings.`
      );
    }

    const mailOptions = {
      from: userConfig.smtp.user, // Use configured SMTP user as sender
      to,
      subject,
      html: content,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('SMTP Error Details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      message: error.message,
      stack: error.stack
    });
    
    let errorMessage;
    if (error.message.includes('SMTP configuration')) {
      errorMessage = error.message;
    } else if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed - check your credentials';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Could not connect to SMTP server';
    } else {
      errorMessage = `Failed to send email: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

// Add verification email sender
export const sendVerificationEmail = async (userEmail, verificationUrl) => {
  try {
    const transporter = createVerificationTransport();
    await transporter.verify();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const mailOptions = {
      from: process.env.ROOT_EMAIL,
      to: userEmail,
      subject: 'Verify your email address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333; text-align: center;">Email Verification</h1>
          <p>Thank you for registering with ${appUrl}. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p style="color: #666;">This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't create an account with ${appUrl}, please ignore this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Verification Email Error:', error);
    throw new Error('Failed to send verification email');
  }
};

// Fetch and store external emails
export const fetchAndStoreExternalEmails = async (userId) => {
  try {
    await connect();
    console.log('🔄 Starting email fetch process for user:', userId);
    
    const user = await User.findById(userId)
      .select('+emailConfig.smtp.password +emailConfig.imap.password');
    
    if (!user?.emailConfig?.imap?.host) {
      console.log('Email not configured for user:', userId);
      return { success: false, error: 'EMAIL_NOT_CONFIGURED' };
    }

    console.log('📥 Fetching emails from IMAP server...');
    const emails = await fetchEmailsIMAP(user);
    console.log(`✅ Fetched ${emails.length} emails from IMAP`);

    return { success: true, emails };
  } catch (error) {
    console.error('❌ Error in fetchEmailsIMAP:', error);
    throw error;
  }
};

const formatEmailAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const { text, value } = addr;
  if (Array.isArray(value)) {
    return value.map(v => v.address).join(', ');
  }
  return text || '';
};

const processMessage = async (rawEmail, attrs = {}) => {
  try {
    const parsed = await simpleParser(rawEmail);
    const envelope = attrs.envelope || {};
    
    // Extract sender details with better fallbacks
    const fromEnvelope = envelope.from?.[0] || {};
    const fromHeader = parsed.from?.value?.[0] || {};
    
    // Build sender information
    const senderName = fromEnvelope.name || 
                      fromHeader.name || 
                      parsed.from?.text?.split('<')[0]?.trim() || 
                      fromEnvelope.mailbox || 
                      '';
                      
    const senderEmail = fromEnvelope.mailbox && fromEnvelope.host ? 
      `${fromEnvelope.mailbox}@${fromEnvelope.host}` : 
      fromHeader.address || 
      parsed.from?.text?.match(/<(.+)>/)?.[1] || 
      '';

    // Extract recipient details
    const toEnvelope = envelope.to?.[0] || {};
    const toHeader = parsed.to?.value?.[0] || {};
    
    const recipientName = toEnvelope.name || toHeader.name || '';
    const recipientEmail = toEnvelope.mailbox && toEnvelope.host ? 
      `${toEnvelope.mailbox}@${toEnvelope.host}` : 
      toHeader.address || '';

    // Format sender/recipient strings
    const from = senderName ? `${senderName} <${senderEmail}>` : senderEmail;
    const to = recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail;

    return {
      // ...existing code...
      from,
      fromDetails: {
        name: senderName.replace(/["']/g, '').trim(),
        email: senderEmail,
        raw: from,
        mailbox: fromEnvelope.mailbox || '',
        host: fromEnvelope.host || '',
        displayName: senderName || senderEmail.split('@')[0] || 'Unknown'
      },
      to,
      toDetails: {
        name: recipientName.replace(/["']/g, '').trim(),
        email: recipientEmail,
        raw: to,
        mailbox: toEnvelope.mailbox || '',
        host: toEnvelope.host || ''
      },
      // ...existing code...
    };
  } catch (error) {
    // ...existing code...
  }
};

// Add retry utility at module level
const retryWithDelay = async (fn, retries = MAX_RETRIES, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Update IMAP configuration to handle connection issues
const FOLDER_MAPPING = {
  'inbox': 'INBOX',
  'sent': '[Gmail]/Sent Mail',
  'drafts': '[Gmail]/Drafts',
  'spam': '[Gmail]/Spam',
  'trash': '[Gmail]/Trash',
  'archive': '[Gmail]/All Mail',
  'starred': '[Gmail]/Starred',
  'all': '[Gmail]/All Mail', // Add this line
  // Add mappings for other email providers
  'hotmail': {
    'sent': 'Sent',
    'spam': 'Junk',
    'trash': 'Deleted',
    'archive': 'Archive'
  },
  'yahoo': {
    'sent': 'Sent',
    'spam': 'Bulk Mail',
    'trash': 'Trash',
    'archive': 'Archive'
  }
};

// Add connection pooling configuration
const CONNECTION_POOL_SIZE = 5;
const CONNECTION_TIMEOUT = 1000 * 60 * 5; // 5 minutes

// Optimize IMAP connection pooling
// Removed duplicate getImapConnection function

// Merge and optimize fetchEmailsIMAP function
const DEFAULT_FETCH_OPTIONS = {
  bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
  struct: true,
  envelope: true,
  size: true,
  flags: true
};

// Removed duplicate fetchEmailsIMAP function

const FOLDERS = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive', 'starred'];

export const fetchAllEmails = async (user, page = 1, limit = 50) => {
  if (!user?.emailConfig) {
    throw new Error('Email configuration not found');
  }

  const credentials = user.getEmailCredentials();
  if (!credentials?.imap) {
    throw new Error('IMAP credentials not found');
  }

  const allEmails = [];
  for (const folder of FOLDERS) {
    const result = await fetchEmailsIMAP(user, folder, 1, 0); // Fetch all emails from each folder
    allEmails.push(...result.emails);
  }

  // Sort all emails by date
  allEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Handle pagination after fetching all emails
  const startIdx = (page - 1) * limit;
  const endIdx = startIdx + limit;
  const paginatedEmails = allEmails.slice(startIdx, endIdx);

  return {
    success: true,
    emails: paginatedEmails,
    pagination: {
      total: allEmails.length,
      pages: Math.ceil(allEmails.length / limit),
      current: page,
      hasMore: endIdx < allEmails.length,
      totalEmails: allEmails.length
    }
  };
};

// Email CRUD operations
export const sendEmail = async ({ from, to, subject, content, userConfig }) => {
  if (!validateEmail(to)) {
    throw new Error('Invalid recipient email address');
  }

  try {
    if (!userConfig) {
      throw new Error('Email configuration is required');
    }

    const smtpResult = await sendEmailSMTP({ 
      from: from.email, 
      to, 
      subject, 
      content,
      userConfig
    });

    const sender = await User.findById(from.userId);
    if (!sender) {
      throw new Error('Sender not found');
    }

    const recipientUser = await User.findOne({ email: to });
    const conversationId = generateConversationId(from.email, to, subject);

    // Find existing conversation or create new one
    let conversation = await Email.findOne({ conversationId });

    if (!conversation) {
      conversation = await Email.create({
        conversationId,
        participants: [sender._id, recipientUser?._id].filter(Boolean),
        subject,
        messages: [],
        status: 'sent',
        toEmail: !recipientUser ? to : undefined
      });
    }

    // Add new message to conversation
    const newMessage = {
      from: sender._id,
      content,
      createdAt: new Date()
    };

    await Email.findByIdAndUpdate(
      conversation._id,
      {
        $push: { messages: newMessage },
        $set: { lastMessageAt: new Date() }
      },
      { new: true }
    );

    return {
      success: true,
      conversation,
      smtpResult
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export const getEmails = async (userId, { folder, page = 1, limit = ITEMS_PER_PAGE, search = '' }) => {
  try {
    await connect();
    
    console.log('📂 Fetching emails from database:', { folder, page, limit });
    
    const query = {
      participants: userId,
      status: folder,
      ...(search && {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { 'messages.content': { $regex: search, $options: 'i' } }
        ]
      })
    };

    const [conversations, total] = await Promise.all([
      Email.find(query)
        .select('subject messages participants lastMessageAt status')
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('participants', 'name email')
        .lean(),
      Email.countDocuments(query)
    ]);

    console.log('📨 Found emails in database:', {
      count: conversations.length,
      total
    });

    return {
      success: true,
      emails: conversations.map(conv => ({
        ...conv,
        id: conv._id.toString(),
        participants: conv.participants?.map(p => ({
          id: p._id?.toString(),
          name: p.name,
          email: p.email
        }))
      })),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        hasMore: page * limit < total
      }
    };
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    return {
      success: false,
      emails: [],
      pagination: { total: 0, pages: 0, current: 1 },
      error: error.message
    };
  }
};

export const moveToFolder = async (emailId, userId, folder) => {
  try {
    const email = await Email.findOne({
      _id: emailId,
      $or: [{ to: userId }, { from: userId }]
    });

    if (!email) throw new Error('Email not found');

    if (folder === 'trash') {
      email.deletedAt = new Date();
    }

    email.status = folder;
    await email.save();

    return email;
  } catch (error) {
    console.error(`Failed to move email to ${folder}:`, error);
    throw new Error(`Failed to move email to ${folder}`);
  }
};

export const permanentlyDeleteEmail = async (emailId, userId) => {
  try {
    const email = await Email.findOne({
      _id: emailId,
      $or: [{ to: userId }, { from: userId }],
      status: 'trash'
    });

    if (!email) throw new Error('Email not found in trash');

    await Email.deleteOne({ _id: emailId });
    return true;
  } catch (error) {
    console.error('Failed to delete email:', error);
    throw new Error('Failed to delete email');
  }
};

// Add bulk operations for efficiency
export const bulkMoveToFolder = async (emailIds, userId, folder) => {
  try {
    await Email.updateMany(
      {
        _id: { $in: emailIds },
        $or: [{ to: userId }, { from: userId }]
      },
      {
        $set: {
          status: folder,
          ...(folder === 'trash' ? { deletedAt: new Date() } : {})
        }

      }
    );
    return true;
  } catch (error) {
    console.error(`Failed to move emails to ${folder}:`, error);
    throw new Error(`Failed to move emails to ${folder}`);
  }
};

// Update connection constants
const IMAP_CONFIG = {
  connTimeout: 5000, // 5 seconds
  authTimeout: 5000,
  keepalive: false,
  tlsOptions: { 
    rejectUnauthorized: false,
    timeout: 3000
  }
};

// Add connection pool with cleanup
const imapPool = new Map();
const POOL_CLEANUP_INTERVAL = 60000; // 1 minute

setInterval(() => {
  const now = Date.now();
  for (const [key, conn] of imapPool.entries()) {
    if (now - conn.lastUsed > 30000) { // 30 seconds
      if (conn.imap?.state === 'connected') {
        conn.imap.end();
      }
      imapPool.delete(key);
    }
  }
}, POOL_CLEANUP_INTERVAL);

// Optimized getImapConnection function
const getImapConnection = async (userConfig) => {
  try {
    const poolKey = `${userConfig.imap.user}`;
    let pooledConn = imapPool.get(poolKey);

    if (pooledConn?.imap?.state === 'connected') {
      pooledConn.lastUsed = Date.now();
      return pooledConn.imap;
    }

    const password = userConfig.imap.password.includes(':') 
      ? await decrypt(userConfig.imap.password)
      : userConfig.imap.password;

    const config = {
      ...IMAP_CONFIG,
      user: userConfig.imap.user,
      password,
      ...(userConfig.imap.user.toLowerCase().endsWith('@gmail.com') 
        ? GMAIL_IMAP_CONFIG 
        : {
          host: userConfig.imap.host,
          port: userConfig.imap.port,
          tls: true
        })
    };

    const imap = new Imap(config);
    
    const connection = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        imap.end();
        reject(new Error('IMAP connection timeout'));
      }, 5000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        resolve(imap);
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      imap.connect();
    });

    const connectedImap = await connection;
    imapPool.set(poolKey, { imap: connectedImap, lastUsed: Date.now() });
    return connectedImap;
  } catch (error) {
    throw new Error(`IMAP Connection failed: ${error.message}`);
  }
};

// Optimized fetchEmailsIMAP function with retries
export const fetchEmailsIMAP = async (user, folder = 'inbox', page = 1, limit = 50) => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      const imap = await getImapConnection(user.emailConfig);
      
      // Add timeout to the fetch operation
      const fetchPromise = new Promise((resolve, reject) => {
        // ...existing email fetch code...
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fetch operation timeout')), 25000);
      });

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};
