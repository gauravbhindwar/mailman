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

// Reduce the default limit for Vercel
const DEFAULT_LIMIT = 20;
const API_TIMEOUT = 25000; // 25 seconds, leaving buffer for Vercel's 30s limit

export async function GET(req, context) {
  let timeoutId;
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, API_TIMEOUT);
    });

    const resultPromise = (async () => {
      const { folder } = context.params;
      const searchParams = new URL(req.url).searchParams;
      
      // Enforce smaller limit for Vercel
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = Math.min(parseInt(searchParams.get('limit')) || DEFAULT_LIMIT, DEFAULT_LIMIT);
      const refresh = searchParams.get('refresh') === 'true';

      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check cache first
      const cacheKey = getCacheKey(session.user.id, folder, page, limit);
      if (!refresh) {
        const cached = cache.get(cacheKey);
        if (cached) {
          return NextResponse.json({ ...cached, cached: true });
        }
      }

      await connect();
      
      const user = await User.findById(session.user.id)
        .select('+emailConfig.smtp.password +emailConfig.imap.password');
      
      if (!user?.emailConfig?.imap) {
        return NextResponse.json(
          { error: "EMAIL_NOT_CONFIGURED" }, 
          { status: 400 }
        );
      }

      // Fetch emails with timeout awareness
      const result = await fetchEmailsIMAP(user, folder, page, limit);
      
      if (result.success) {
        cache.set(cacheKey, result, 60); // Cache for 1 minute
      }

      return NextResponse.json(result);
    })();

    const result = await Promise.race([resultPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;

  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error('Email API Error:', {
      message: error.message,
      code: error.code
    });

    // Special handling for timeouts
    if (error.message === 'TIMEOUT') {
      return NextResponse.json({
        error: 'Request timeout - please try again',
        code: 'TIMEOUT'
      }, { status: 504 });
    }

    return NextResponse.json({
      error: 'Failed to fetch emails',
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}