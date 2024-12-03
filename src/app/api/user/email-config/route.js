
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connect } from "../../../../lib/dbConfig";
import User from "../../../../models/User";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connect();
    const data = await req.json();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.emailConfig = data.emailConfig;
    await user.save();

    return NextResponse.json({ message: "Email configuration updated successfully" });
  } catch (error) {
    console.error("Error updating email config:", error);
    return NextResponse.json(
      { error: "Failed to update email configuration" },
      { status: 500 }
    );
  }
}