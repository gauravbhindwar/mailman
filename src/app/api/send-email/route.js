import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getEmailConfig } from "@/utils/email-config";
import { sendEmail } from "@/utils/emailService";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, content } = await req.json();

    // Get email configuration for the user
    const userConfig = await getEmailConfig(session.user.id);

    const result = await sendEmail({
      from: {
        userId: session.user.id,
        email: session.user.email
      },
      to,
      subject,
      content,
      userConfig // Pass the user's email configuration
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Send Email API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to send email' 
      }, 
      { status: 500 }
    );
  }
}