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

const ITEMS_PER_PAGE = 20;

// Initialize cache with 5 minute TTL
const emailCache = new NodeCache({ stdTTL: 300 });

// Add connection pool
const imapConnectionPool = new Map();
const MAX_RETRIES = 3;

// Email validation
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Create dynamic SMTP transporter with user config
const createSMTPTransport = (userConfig) => {
  return nodemailer.createTransport({
    service: userConfig?.smtp?.service || 'gmail',
    host: userConfig?.smtp?.host || 'smtp.gmail.com',
    port: parseInt(userConfig?.smtp?.port) || 465,
    secure: userConfig?.smtp?.secure ?? true,
    auth: {
      user: userConfig?.smtp?.user,
      pass: userConfig?.smtp?.password,
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
export const sendEmailSMTP = async ({ from, to, subject, content, attachments = [] }) => {
  try {
    await connect();
    
    if (!from?.userId) {
      throw new Error('Missing sender information');
    }

    const user = await User.findById(from.userId)
      .select('+emailConfig.smtp.password')
      .lean();

    if (!user) {
      throw new Error(`User not found with ID: ${from.userId}`);
    }

    if (!user.emailConfig?.smtp?.password) {
      throw new Error('SMTP configuration not found. Please configure your email settings first.');
    }

    const credentials = {
      smtp: {
        ...user.emailConfig.smtp,
        password: user.emailConfig.smtp.password ? decrypt(user.emailConfig.smtp.password) : null
      }
    };

    if (!credentials.smtp.password) {
      throw new Error('SMTP password not found or could not be decrypted');
    }

    const transporter = createSMTPTransport(credentials);
    
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP Verification Error:', verifyError);
      throw new Error('Failed to verify SMTP connection. Please check your email settings and ensure app password is configured correctly.');
    }

    const mailOptions = {
      from: credentials.smtp.user,
      to,
      subject,
      html: content,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('SMTP Error:', error);
    error.status = error.message.includes('configuration') ? 400 : 500;
    throw error;
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
    await connect(); // Ensure DB connection

    console.log('Fetching external emails for userId:', userId); // Add logging
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return { success: false, emails: [] };
    }

    const emails = await fetchEmailsIMAP(user);
    console.log(`Fetched ${emails.length} emails for user:`, user.email);

    const savedEmails = [];
    for (const email of emails) {
      try {
        const conversationId = generateConversationId(
          email.from || 'unknown',
          user.email,
          email.subject || 'No Subject'
        );

        // Find or create conversation
        let conversation = await Email.findOne({ conversationId });
        
        if (!conversation) {
          conversation = await Email.create({
            conversationId,
            participants: [user._id],
            subject: email.subject || 'No Subject',
            messages: [],
            status: 'inbox',
            toEmail: user.email
          });
        }

        // Check if message already exists
        const messageExists = conversation.messages.some(
          msg => msg.externalId === email.messageId
        );

        if (!messageExists) {
          await Email.findByIdAndUpdate(
            conversation._id,
            {
              $push: {
                messages: {
                  externalSender: email.from,
                  content: email.content || 'No content',
                  createdAt: email.date || new Date(),
                  attachments: email.attachments || [],
                  externalId: email.messageId,
                  read: false
                }
              },
              $set: { 
                lastMessageAt: email.date || new Date(),
                status: 'inbox'
              }
            }
          );
        }
        
        savedEmails.push(conversation);
      } catch (error) {
        console.error('Error processing email:', error);
        continue; // Continue with next email if one fails
      }
    }

    return { success: true, emails: savedEmails };
  } catch (error) {
    console.error('Error in fetchAndStoreExternalEmails:', error);
    return { success: false, emails: [] };
  }
};

// Add generateXOAuth2Token function
const generateXOAuth2Token = (user, password) => {
  const authData = `user=${user}\x01auth=Bearer ${password}\x01\x01`;
  return Buffer.from(authData).toString('base64');
};

// Update IMAP configuration to handle connection issues
export const fetchEmailsIMAP = async (user) => {
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

  // Check connection pool
  const poolKey = `${user._id}:${Date.now()}`;
  if (imapConnectionPool.has(poolKey)) {
    return imapConnectionPool.get(poolKey);
  }

  // Get user with email config including encrypted passwords
  const userWithConfig = await User.findById(user._id)
    .select('+emailConfig.smtp.password +emailConfig.imap.password');
  
  if (!userWithConfig?.emailConfig?.imap) {
    throw new Error('IMAP configuration not found');
  }

  const credentials = userWithConfig.getEmailCredentials();

  // Simple IMAP config with PLAIN auth
  const imapConfig = {
    user: credentials.imap.user,
    password: credentials.imap.password,
    host: credentials.imap.host,
    port: credentials.imap.port,
    tls: true,
    tlsOptions: { 
      rejectUnauthorized: false,
      servername: credentials.imap.host
    },
    authTimeout: 30000,
    connTimeout: 30000,
    debug: process.env.NODE_ENV === 'development' ? console.log : null,
    auth: {
      user: credentials.imap.user,
      password: credentials.imap.password,
      // Use PLAIN auth
      authMethod: 'PLAIN'
    }
  };

  console.log('Connecting with config:', {
    ...imapConfig,
    password: '***hidden***'
  });

  const fetchEmails = () => new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const emails = [];

    const handleError = (error) => {
      console.error('IMAP Error:', error);
      if (error.source === 'authentication') {
        console.error(`
          Authentication failed for ${credentials.imap.user}. 
          Please ensure:
          1. App Password is used if 2FA is enabled
          2. Less secure app access is enabled (if not using App Password)
          3. IMAP is enabled in Gmail settings
        `);
      }
      reject(error);
    };

    const processMessage = async (stream) => {
      try {
        const parsed = await simpleParser(stream);
        emails.push({
          messageId: parsed.messageId,
          from: parsed.from.text,
          to: parsed.to.text,
          subject: parsed.subject || '(No Subject)',
          content: parsed.html || parsed.textAsHtml || parsed.text,
          attachments: parsed.attachments,
          date: parsed.date
        });
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // Fetch last 50 messages
        const fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - 49)}:*`, {
          bodies: '',
          struct: true
        });

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            processMessage(stream);
          });
        });

        fetch.once('error', (err) => {
          console.error('Fetch error:', err);
          imap.end();
          reject(err);
        });

        fetch.once('end', () => {
          imap.end();
          resolve(emails);
        });
      });
    });

    imap.once('error', handleError);

    imap.once('end', () => {
      console.log('IMAP connection ended');
    });

    try {
      imap.connect();
    } catch (err) {
      handleError(err);
    }
  });

  const emails = await retryWithDelay(() => fetchEmails());
  imapConnectionPool.set(poolKey, emails);
  
  // Cleanup pool after 5 minutes
  setTimeout(() => imapConnectionPool.delete(poolKey), 300000);
  
  return emails;
};

// Email CRUD operations
export const sendEmail = async ({ from, to, subject, content }) => {
  if (!validateEmail(to)) {
    const error = new Error('Invalid recipient email address');
    error.status = 400;
    throw error;
  }

  if (!from?.userId) {
    const error = new Error('Sender ID is required');
    error.status = 400;
    throw error;
  }

  try {
    const smtpResult = await sendEmailSMTP({ 
      from, 
      to, 
      subject, 
      content 
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

    return conversation;
  } catch (error) {
    console.error('Failed to send email:', error);
    error.status = error.status || 500;
    throw error;
  }
};

export const getEmails = async (userId, { folder, page = 1, limit = ITEMS_PER_PAGE, search = '' }) => {
  try {
    const cacheKey = `emails:${userId}:${folder}:${page}:${limit}:${search}`;
    const cached = emailCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    await connect();
    
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
        .select('subject messages.content messages.createdAt participants lastMessageAt status')
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('participants', 'name email')
        .lean(),
      Email.countDocuments(query)
    ]);

    const result = {
      emails: conversations.map(conv => ({
        ...conv,
        id: conv._id.toString(),
        participants: conv.participants?.map(p => ({
          id: p._id.toString(),
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

    emailCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    throw new Error('Failed to fetch emails');
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
