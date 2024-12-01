import { NextResponse } from 'next/server';
import { connect } from '../../../../lib/dbConfig';
import User from '../../../../models/User';
import jwt from 'jsonwebtoken';
import { generateVerificationToken, createVerificationUrl } from '../../../../utils/emailUtils';
import { sendVerificationEmail } from '../../../../utils/emailService';

export async function POST(req) {
  try {
    await connect();
    const body = await req.json();
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: body.email },
        { username: body.username }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email or username' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with verification data
    const user = await User.create({
      ...body,
      verificationToken,
      verificationExpires,
      isVerified: false
    });

    // Generate verification URL and send email
    const verificationUrl = createVerificationUrl(verificationToken);
    await sendVerificationEmail(user.email, verificationUrl);

    return NextResponse.json({
      success: true,
      message: 'Please check your email to verify your account',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}