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

    // Clear cache if refresh is requested
    const cacheKey = getCacheKey(user._id, folder, page, limit);
    if (refresh) {
      cache.del(cacheKey);
    }
    
    let result;
    if (!refresh) {
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
      result = await fetchEmailsIMAP(user, folder, page, limit);

      if (result.success) {
        // Set cache with 5 minute TTL for better performance
        cache.set(cacheKey, result, 300); // 5 minute TTL
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