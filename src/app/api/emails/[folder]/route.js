import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { NextResponse } from "next/server";
import { cache, getCacheKey } from "@/utils/cache";
import { fetchEmailsIMAP } from "@/utils/emailService";
import User from "@/models/User";
import { connect } from "@/lib/dbConfig";

export async function GET(req, context) {
  try {
    const { folder } = await context.params;
    if (!folder) {
      return NextResponse.json({ error: "Folder not specified" }, { status: 400 });
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

    const searchParams = new URL(req.url).searchParams;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const refresh = searchParams.get('refresh') === 'true';
    
    // Special handling for sent folder
    const folderPath = folder === 'sent' 
      ? '[Gmail]/Sent Mail'
      : folder === 'all' ? '[Gmail]/All Mail' : folder.toUpperCase();

    // Clear cache on refresh or if timestamp is provided
    const timestamp = searchParams.get('t');
    const shouldRefresh = refresh || timestamp;

    const cacheKey = getCacheKey(user._id, folder, page, limit);
    if (shouldRefresh) {
      cache.del(cacheKey);
    }

    let result;
    if (!shouldRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`📫 Returning cached ${folder} emails`);
        return NextResponse.json({
          ...cached,
          cached: true
        });
      }
    }

    console.log(`🔄 Fetching fresh ${folder} emails`);
    try {
      result = await fetchEmailsIMAP(user, folderPath, page, limit);
      
      if (result.success) {
        // For sent folder, filter emails sent by the user
        if (folder === 'sent') {
          result.emails = result.emails.filter(email => {
            const fromEmail = email.fromDetails?.email || email.from.match(/<(.+)>/)?.[1] || email.from;
            return fromEmail.toLowerCase() === user.emailConfig.smtp.user.toLowerCase();
          });
          
          // Update pagination
          result.pagination.total = result.emails.length;
          result.pagination.pages = Math.ceil(result.emails.length / limit);
        }

        cache.set(cacheKey, result, 60);
        return NextResponse.json({
          ...result,
          cached: false
        });
      }

      throw new Error(result.error || `Failed to fetch ${folder} emails`);
    } catch (fetchError) {
      console.error('Email fetch error:', fetchError);
      return NextResponse.json(
        { error: fetchError.message || 'Failed to fetch emails' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}