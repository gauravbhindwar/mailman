import nodemailer from "nodemailer";
import smtpTransport from "nodemailer-smtp-transport";
import bcrypt from "bcryptjs";
import { connect } from "../../../../lib/dbConfig";
import { Mentor, Mentee, Admin } from "../../../../lib/dbModels";
import { NextResponse } from 'next/server';

// Function to generate a 6-digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
};

// Configure the nodemailer transport for sending emails
const transporter = nodemailer.createTransport(smtpTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
}));

// Function to send OTP via email
const sendOtpEmail = async (email, otp) => {
    await transporter.sendMail({
        from: `"Your Service Name" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}`,
        html: `<p>Your OTP is <b>${otp}</b></p>`,
        headers: {
            'X-Priority': '1 (Highest)',
            'X-MSMail-Priority': 'High',
            'Importance': 'High'
        }
    });
};

// Function to check user based on role and store OTP in their document
const storeOtpForUser = async (email, role, otp) => {
    let User;
    switch (role) {
        case 'mentor':
            User = Mentor;
            break;
        case 'admin':
        case 'superadmin': // Combined case for both admin types
            User = Admin;
            break;
        case 'mentee':
            User = Mentee;
            break;
        default:
            throw new Error("Invalid role");
    }

    await connect();
    
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error(`${role} not found`);
    }

    // Hash the OTP
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Update user document
    user.otp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.isOtpUsed = false;

    // Save and verify
    await user.save();

    return user;
};

// Main POST handler to send OTP
export async function POST(req) {
    try {
        const { email, role } = await req.json();

        if (!email || !role) {
            return NextResponse.json(
                { success: false, message: "Email and role are required" },
                { status: 400 }
            );
        }

        // Generate OTP and send it via email
        const generatedOtp = generateOtp();
        await storeOtpForUser(email, role, generatedOtp); // Store OTP in user document
        await sendOtpEmail(email, generatedOtp); // Send OTP email

        return NextResponse.json({ success: true, message: "OTP sent" }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error.message || "Error processing request" },
            { status: 500 }
        );
    }
}