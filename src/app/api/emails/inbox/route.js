import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { getInboxEmails } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('📥 Inbox API called for user:', session.user.id);

    const searchParams = new URL(req.url).searchParams;
    const page = parseInt(searchParams.get('page')) || 1;
    const refresh = searchParams.get('refresh') === 'true';

    const result = await getInboxEmails(session.user.id, refresh);
    
    // If emails were fetched successfully but empty, don't show error
    if (result.success) {
      delete result.error;
    }

    console.log('📬 Inbox response:', {
      hasEmails: result.emails?.length > 0,
      emailCount: result.emails?.length,
      error: result.error
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Inbox API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}