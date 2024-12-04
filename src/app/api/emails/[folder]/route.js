import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { NextResponse } from "next/server";
import { cache, getCacheKey } from "@/utils/cache";
import { fetchEmailsIMAP } from "@/utils/emailService";
import User from "@/models/User";
import { connect } from "@/lib/dbConfig";
import { simpleParser } from 'mailparser';

export const runtime = 'nodejs';

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
const DEFAULT_LIMIT = 10; // Reduced from 20
const API_TIMEOUT = 20000; // 20 seconds

export async function GET(request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  let isCancelled = false;
  let cacheKey = null;

  try {
    // Get folder from URL path instead of context.params
    const folder = request.url.split('/').pop().split('?')[0];

    if (!folder) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: "Folder parameter is required" }, { status: 400 });
    }

    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || DEFAULT_LIMIT, DEFAULT_LIMIT);
    const refresh = searchParams.get('refresh') === 'true';

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check cache first
    cacheKey = getCacheKey(session.user.id, folder, page, limit);
    if (!refresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        clearTimeout(timeoutId);
        return NextResponse.json({ ...cached, cached: true });
      }
    }

    await connect();
    
    const user = await User.findById(session.user.id)
      .select('+emailConfig.smtp.password +emailConfig.imap.password');
    
    if (!user?.emailConfig?.imap) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 400 });
    }

    // Pass resolved folder to fetchEmailsIMAP
    const result = await fetchEmailsIMAP({
      emailConfig: user.emailConfig,
      folder,
      page,
      limit
    });

    if (result.success) {
      cache.set(cacheKey, result, 60);
    }

    clearTimeout(timeoutId);
    return NextResponse.json(result);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Email API Error:', error);

    if (error.name === 'AbortError' || error.message === 'Operation timed out') {
      return NextResponse.json({
        error: 'Request timeout - please try again',
        code: 'TIMEOUT'
      }, { status: 504 });
    }

    return NextResponse.json({
      error: 'Failed to fetch emails',
      details: error.message
    }, { status: 500 });
  }
}