import { getServerSession } from "next-auth/next";
import { connect } from "@/lib/dbConfig";
import User from "@/models/User";

export async function PUT(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401
      });
    }

    await connect();

    const config = await request.json();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404
      });
    }

    // Update email configuration
    user.emailConfig = config;

    // Test connection before saving
    try {
      await user.testEmailConnection();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Failed to connect with provided credentials. Please check your settings and ensure less secure app access is enabled for Gmail.",
        details: error.message 
      }), {
        status: 400
      });
    }

    await user.save();

    return new Response(JSON.stringify({ success: true }), {
      status: 200
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}