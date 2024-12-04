import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { NextResponse } from "next/server";
import { cache, getCacheKey } from "@/utils/cache";
import { fetchEmailsIMAP } from "@/utils/emailService";
import { connect } from "@/lib/dbConfig";

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 10;
const API_TIMEOUT = 20000;

export async function GET(request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  let cacheKey = null;

  try {
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

    if (!session.emailCredentials) {
      return NextResponse.redirect('/dashboard/settings/email');
    }

    cacheKey = getCacheKey(session.user.id, folder, page, limit);
    if (!refresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        clearTimeout(timeoutId);
        return NextResponse.json({ ...cached, cached: true });
      }
    }

    await connect();
    
    const result = await fetchEmailsIMAP({
      userId: session.user.id,
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

    if (error.message === 'Invalid credentials (Failure)') {
      return NextResponse.json({
        error: 'Invalid email credentials - please check your email settings',
        code: 'INVALID_CREDENTIALS'
      }, { status: 401 });
    }

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