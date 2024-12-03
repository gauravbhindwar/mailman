import { NextResponse } from 'next/server';
import { sendEmailSMTP, fetchEmailsIMAP } from '@/utils/emailService';
import { auth } from '@/lib/auth';
import { encrypt } from '@/utils/encryption';
import User from '@/models/User';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, content, attachments } = await request.json();
    
    const result = await sendEmailSMTP({
      from: {
        email: session.user.email,
        name: session.user.name,
      },
      to,
      subject,
      content,
      attachments,
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Email sending failed:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emails = await fetchEmailsIMAP(session.user.id);
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Email fetching failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { smtp, imap } = await request.json();
    
    // Encrypt passwords before saving
    const encryptedConfig = {
      smtp: {
        ...smtp,
        password: encrypt(smtp.password)
      },
      imap: {
        ...imap,
        password: encrypt(imap.password)
      }
    };
    
    await User.findByIdAndUpdate(session.user.id, {
      emailConfig: encryptedConfig
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update email config:', error);
    return NextResponse.json(
      { error: 'Failed to update email configuration' },
      { status: 500 }
    );
  }
}
