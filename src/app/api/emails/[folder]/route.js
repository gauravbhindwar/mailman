import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { NextResponse } from "next/server";
import { cache, getCacheKey } from "@/utils/cache";
import { fetchEmailsIMAP } from "@/utils/emailService";
import User from "@/models/User";
import { connect } from "@/lib/dbConfig";
import { simpleParser } from 'mailparser';

const parseEmailContent = async (content) => {
  if (!content) return null;
  
  try {
    // If content is already parsed
    if (typeof content === 'object' && (content.html || content.text)) {
      return content;
    }

    // Parse only if content is a string
    if (typeof content === 'string') {  // Fixed 'is' to '==='
      const buffer = Buffer.from(content);
      const parsed = await simpleParser(buffer);
      return {
        html: parsed.html,
        text: parsed.text,
        attachments: parsed.attachments
      };
    }

    return {
      html: '',
      text: 'Invalid email content',
      attachments: []
    };
  } catch (error) {
    console.error('Email parsing error:', error);
    return {
      html: '',
      text: String(content) || 'Failed to parse email content',
      attachments: []
    };
  }
};

export async function GET(req, context) {
  try {
    // Add timeout for the entire request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    const resultPromise = (async () => {
      const { folder } = context.params;
      
      // Early validation
      const validFolders = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive', 'starred', 'all'];
      if (!folder || !validFolders.includes(folder.toLowerCase())) {
        return NextResponse.json(
          { error: "Invalid folder specified" }, 
          { status: 400 }
        );
      }

      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await connect();
      
      const user = await User.findById(session.user.id)
        .select('+emailConfig.smtp.password +emailConfig.imap.password');
      
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (!user.emailConfig?.imap) {
        throw new Error('EMAIL_NOT_CONFIGURED');
      }

      const searchParams = new URL(req.url).searchParams;
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 50;
      const refresh = searchParams.get('refresh') === 'true';

      // Enhanced folder mapping for Gmail and other providers
      const folderMap = {
        'sent': '[Gmail]/Sent Mail',
        'all': '[Gmail]/All Mail',
        'archive': '[Gmail]/All Mail',
        'trash': '[Gmail]/Trash',
        'spam': '[Gmail]/Spam',
        'drafts': '[Gmail]/Drafts',
        'starred': '[Gmail]/Starred',
        'inbox': 'INBOX'
      };

      const folderPath = folderMap[folder.toLowerCase()] || folder;
      console.log(`📂 Fetching emails from folder: ${folderPath}`);

      const cacheKey = getCacheKey(user._id, folder, page, limit);
      if (refresh) {
        cache.del(cacheKey);
      }

      // Try cache first
      const cached = !refresh && cache.get(cacheKey);
      if (cached) {
        console.log(`📫 Returning cached ${folder} emails`);
        return NextResponse.json({ ...cached, cached: true });
      }

      // Log connection attempt
      console.log('Attempting IMAP connection for user:', user._id);

      // Fetch fresh emails
      const result = await fetchEmailsIMAP(user, folderPath, page, limit);
      
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to fetch emails');
      }

      // Parse MIME content for each email
      const parsedEmails = await Promise.all(
        result.emails.map(async (email) => {
          if (email.content) {
            try {
              const parsedContent = await parseEmailContent(email.content);
              return {
                ...email,
                content: parsedContent
              };
            } catch (error) {
              console.error('Failed to parse email content:', error);
              return {
                ...email,
                content: {
                  html: '',
                  text: String(email.content) || 'Failed to parse content',
                  attachments: []
                }
              };
            }
          }
          return email;
        })
      );

      const response = {
        ...result,
        emails: parsedEmails,
        cached: false
      };

      // Cache the result
      cache.set(cacheKey, response, 30); // Cache for 30 seconds

      return response;
    })();

    // Race between timeout and actual execution
    const result = await Promise.race([resultPromise, timeoutPromise]);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Email API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Return more detailed error for debugging
    return NextResponse.json({
      error: 'Failed to fetch emails',
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }, { 
      status: error.message === 'EMAIL_NOT_CONFIGURED' ? 400 : 500 
    });
  }
}