import Email from '../models/Email';
import User from '../models/User';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { decrypt } from './encryption';
import { connect } from '../lib/dbConfig';
import { generateConversationId } from './emailUtils';

const ITEMS_PER_PAGE = 20;

// Email validation
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Create dynamic SMTP transporter with Gmail defaults
const createSMTPTransport = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
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
    
    const transporter = createSMTPTransport();
    await transporter.verify();

    const mailOptions = {
      from: process.env.EMAIL_USER, // Use Gmail address from env
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

// Update IMAP configuration to handle connection issues
export const fetchEmailsIMAP = async (user) => {
  // Get user's IMAP credentials
  const credentials = user.getEmailCredentials();
  
  // Use default Gmail configuration if user config is not set
  const imapConfig = {
    user: credentials?.imap?.user || process.env.EMAIL_USER,
    password: credentials?.imap?.password || process.env.EMAIL_PASS,
    host: credentials?.imap?.host || 'imap.gmail.com',
    port: credentials?.imap?.port || 993,
    tls: true,
    tlsOptions: { 
      rejectUnauthorized: false,
      servername: credentials?.imap?.host || 'imap.gmail.com'
    },
    authTimeout: 30000,
    connTimeout: 30000,
    debug: console.log // Add debug logging
  };

  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const emails = [];

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

    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
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
};

// Email CRUD operations
export const sendEmail = async ({ from, to, subject, content }) => {
  if (!validateEmail(to)) {
    throw new Error('Invalid recipient email address');
  }

  try {
    const smtpResult = await sendEmailSMTP({ 
      from: from.email, 
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
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const getEmails = async (userId, { folder, page = 1, limit = ITEMS_PER_PAGE, search = '' }) => {
  try {
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

    const conversations = await Email.find(query)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('participants', 'name email')
      .populate('messages.from', 'name email')
      .lean();

    // Serialize the data to remove MongoDB specific objects
    const serializedEmails = conversations.map(conv => ({
      ...conv,
      id: conv._id.toString(),
      participants: conv.participants?.map(p => ({
        id: p._id.toString(),
        name: p.name,
        email: p.email
      })),
      messages: conv.messages.map(msg => ({
        ...msg,
        id: msg._id.toString(),
        from: msg.from ? {
          id: msg.from._id.toString(),
          name: msg.from.name,
          email: msg.from.email
        } : null,
        createdAt: msg.createdAt.toISOString()
      })),
      lastMessageAt: conv.lastMessageAt.toISOString()
    }));

    const total = await Email.countDocuments(query);

    return {
      emails: serializedEmails,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        hasMore: page * limit < total
      }
    };
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
