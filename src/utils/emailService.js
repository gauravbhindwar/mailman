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

const ITEMS_PER_PAGE = 50; // Ensure consistent limit

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

// Email validation
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Create dynamic SMTP transporter with Gmail defaults
const createSMTPTransport = (userConfig) => {
  return nodemailer.createTransport({
    host: userConfig.smtp?.host || process.env.EMAIL_HOST,
    port: parseInt(userConfig.smtp?.port) || parseInt(process.env.EMAIL_PORT),
    secure: userConfig.smtp?.secure || false,
    auth: {
      user: userConfig.smtp?.user || process.env.EMAIL_USER,
      pass: userConfig.smtp?.password || process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
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

// Send email using Gmail SMTP configuration
export const sendEmailSMTP = async ({ from, to, subject, content, attachments = [], userConfig }) => {
  try {
    await connect();
    
    const transporter = createSMTPTransport(userConfig);
    await transporter.verify();

    const mailOptions = {
      from: userConfig.smtp?.user || process.env.EMAIL_USER,
      to,
      subject,
      html: content,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('SMTP Error:', error);
    throw new Error('Failed to send email via SMTP');
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

const processMessage = async (stream, attrs = {}) => {
  try {
    const parsed = await simpleParser(stream);
    const messageId = attrs?.['x-gm-msgid']?.toString() || parsed.messageId || `${Date.now()}-${Math.random().toString(36)}`;
    return {
      id: messageId,
      messageId,
      uid: attrs?.uid || messageId,
      threadId: attrs?.['x-gm-thrid']?.toString(),
      from: formatEmailAddress(parsed.from),
      to: formatEmailAddress(parsed.to),
      subject: parsed.subject || '(No Subject)',
      content: parsed.html || parsed.textAsHtml || parsed.text,
      attachments: parsed.attachments?.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      })) || [],
      date: attrs?.date || parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
      read: attrs?.flags?.includes('\\Seen') || false,
      labels: attrs?.['x-gm-labels']?.map(label => label.toString().replace(/\\/g, '')) || [],
      flags: attrs?.flags || [],
      internalDate: attrs?.internaldate ? new Date(attrs.internaldate).toISOString() : null
    };
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
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
};

export const fetchEmailsIMAP = async (user, folder = 'inbox', page = 1, limit = ITEMS_PER_PAGE) => {
  if (!user?.emailConfig) {
    throw new Error('Email configuration not found');
  }

  const credentials = user.getEmailCredentials();
  if (!credentials?.imap) {
    throw new Error('IMAP credentials not found');
  }

  // Enhanced credentials validation with detailed error
  const missingFields = [];
  if (!credentials.imap.host) missingFields.push('IMAP Host');
  if (!credentials.imap.port) missingFields.push('IMAP Port');
  if (!credentials.imap.user) missingFields.push('Username');
  if (!credentials.imap.password) missingFields.push('Password');

  if (missingFields.length > 0) {
    throw new Error(
      `Email configuration incomplete. Missing: ${missingFields.join(', ')}`
    );
  }

  // Log configuration without sensitive data
  console.log('🔑 IMAP Configuration:', {
    host: credentials.imap.host,
    port: credentials.imap.port,
    user: credentials.imap.user,
    hasPassword: !!credentials.imap.password,
    isGmail: credentials.imap.user?.toLowerCase().endsWith('@gmail.com')
  });

  // Configure connection
  const imapConfig = {
    user: credentials.imap.user,
    password: credentials.imap.password,
    ...(credentials.imap.user.toLowerCase().endsWith('@gmail.com') ? GMAIL_IMAP_CONFIG : {
      host: credentials.imap.host,
      port: credentials.imap.port,
      tls: true,
      tlsOptions: { 
        rejectUnauthorized: false,
        servername: credentials.imap.host
      }
    }),
    debug: process.env.NODE_ENV === 'development' ? console.log : null,
    authTimeout: 30000,
    connTimeout: 30000
  };

  // Check connection pool
  const poolKey = `${user._id}:${Date.now()}`;
  if (imapConnectionPool.has(poolKey)) {
    return imapConnectionPool.get(poolKey);
  }

  const fetchEmails = () => new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const emails = new Map(); // Use Map to track emails by seqno

    imap.once('ready', () => {
      const imapFolder = FOLDER_MAPPING[folder] || 'INBOX';
      
      imap.openBox(imapFolder, false, async (err, box) => {
        if (err) {
          console.error(`Error opening folder ${imapFolder}:`, err);
          imap.end();
          return reject(err);
        }

        const total = box.messages.total;
        const pageSize = limit;
        // Update pagination calculation
        const startSeqno = Math.max(1, total - (page * pageSize) + 1);
        const endSeqno = Math.min(total, total - ((page - 1) * pageSize));

        if (total === 0) {
          imap.end();
          return resolve({
            success: true,
            emails: [],
            pagination: {
              total: 0,
              pages: 0,
              current: page,
              hasMore: false
            }
          });
        }

        console.log(`📨 Fetching ${folder} emails ${startSeqno}:${endSeqno} (page ${page}/${Math.ceil(total/pageSize)})`);

        // Update fetch range
        const fetch = imap.seq.fetch(`${startSeqno}:${endSeqno}`, {
          bodies: '',
          struct: true,
          markSeen: false,
          envelope: true,
          size: true,
          modifiers: {
            gmThread: true,
            gmLabels: true,
            gmMsgId: true
          }
        });

        fetch.on('message', (msg, seqno) => {
          let currentEmail = { seqno };

          msg.once('attributes', (attrs) => {
            currentEmail.attrs = attrs;
          });

          msg.on('body', async (stream) => {
            emails.set(seqno, currentEmail); // Store reference by seqno
            const parsed = await processMessage(stream, currentEmail.attrs);
            if (parsed) {
              emails.set(seqno, { ...currentEmail, parsed });
            }
          });
        });

        fetch.once('error', (err) => {
          console.error('Fetch error:', err);
          imap.end();
          reject(err);
        });

        fetch.once('end', () => {
          imap.end();
          const processedEmails = Array.from(emails.values())
            .filter(email => email.parsed)
            .map(email => email.parsed)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

          resolve({
            success: true,
            emails: processedEmails,
            pagination: {
              total,
              pages: Math.ceil(total / pageSize),
              current: page,
              hasMore: endSeqno < total,
              totalEmails: total
            }
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP error:', {
        message: err.message,
        source: err.source,
        type: err.type,
        code: err.code
      });
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended');
    });

    try {
      imap.connect();
    } catch (err) {
      console.error('IMAP connect error:', err);
      reject(err);
    }
  });

  try {
    const result = await retryWithDelay(() => fetchEmails());
    return {
      ...result,
      cached: false
    };
  } catch (error) {
    console.error('IMAP Authentication Error:', {
      message: error.message,
      source: error.source,
      type: error.type
    });
    
    return {
      success: false,
      error: error.source === 'authentication' 
        ? 'Authentication failed - please check your email credentials'
        : error.message,
      emails: [],
      pagination: {
        total: 0,
        pages: 0,
        current: 1,
        hasMore: false
      }
    };
  }
};

// Email CRUD operations
export const sendEmail = async ({ from, to, subject, content }) => {
  if (!validateEmail(to)) {
    throw new Error('Invalid recipient email address');
  }

  try {
    const sender = await User.findById(from.userId).select('+emailConfig');
    if (!sender) {
      throw new Error('Sender not found');
    }

    const userConfig = sender.getEmailCredentials();

    const smtpResult = await sendEmailSMTP({ 
      from: from.email, 
      to, 
      subject, 
      content,
      userConfig
    });

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

    return conversation;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
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
