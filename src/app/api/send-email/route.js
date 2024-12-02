import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/authOptions";
import { sendEmail } from "@/utils/emailService";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401 
      });
    }

    const body = await request.json();
    const { to, subject, content } = body;

    if (!to || !subject || !content) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields" 
      }), { 
        status: 400 
      });
    }

    try {
      const result = await sendEmail({
        from: {
          userId: session.user._id || session.user.id, // Try both formats
          email: session.user.email
        },
        to,
        subject,
        content
      });

      return new Response(JSON.stringify({ success: true, data: result }), {
        status: 200
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return new Response(JSON.stringify({ 
        error: error.message || 'Failed to send email',
        details: error.stack
      }), {
        status: error.status || 500
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error" 
    }), { 
      status: 500 
    });
  }
}