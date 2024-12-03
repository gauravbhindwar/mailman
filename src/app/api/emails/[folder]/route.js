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
    // Properly await the params object
    const { folder } = await context.params;
    
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
      return NextResponse.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 400 });
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

    // Fetch fresh emails
    const result = await fetchEmailsIMAP(user, folderPath, page, limit);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch emails');
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
    cache.set(cacheKey, response, 60); // Cache for 60 seconds

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Email API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}