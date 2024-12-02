
import { NextResponse } from 'next/server';
import { getInboxEmails } from '../../../../lib/email';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const page = parseInt(searchParams.get('page')) || 1;

  try {
    const { emails, totalPages } = await getInboxEmails(userId, page);
    return NextResponse.json({ emails, totalPages });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}