import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getEmailConfig } from "@/utils/email-config";
import { sendEmail } from "@/utils/emailService";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const data = await req.json();
    const { to, subject, content } = data;

    // Validate required fields
    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get email configuration for the user
    const userConfig = await getEmailConfig(session.user.id);
    if (!userConfig) {
      return NextResponse.json(
        { error: "EMAIL_NOT_CONFIGURED" },
        { status: 400 }
      );
    }

    // Format email data with content as string
    const emailData = {
      from: {
        userId: session.user.id,
        email: session.user.email
      },
      to,
      subject,
      content, // Pass content directly as string
      userConfig
    };

    // Send email
    const result = await sendEmail(emailData);

    return NextResponse.json({ 
      success: true, 
      id: result.id, // Include email ID for attachment handling
      data: result 
    });

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