import { connect } from "../../../../lib/dbConfig";
import { Mentor, Mentee, Admin } from "../../../../lib/dbModels";
import { NextResponse } from 'next/server';

const checkMentorEmail = async (email) => {
    try {
        console.log(email);
        await connect();
        const mentor = await Mentor.findOne({ email });
        if (mentor) {
            return NextResponse.json({ message: "Mentor found" }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Error retrieving mentor" }, { status: 500 });
    }
};

const checkMenteeEmail = async (email) => {
    try {
        console.log(email);
        await connect();
        const mentee = await Mentee.findOne({ email });
        if (mentee) {
            return NextResponse.json({ message: "Mentee found" }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Mentee not found" }, { status: 404 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Error retrieving mentee" }, { status: 500 });
    }
};

const checkAdminEmail = async (email) => {
    try {
        // console.log(email);
        await connect();
        const admin = await Admin.findOne({ email });
        if (admin) {
            return NextResponse.json({ message: "Admin found" }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Admin not found" }, { status: 404 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Error retrieving admin" }, { status: 500 });
    }
};
const checkSuperAdminEmail = async (email) => {
    try {
        // console.log(email);
        await connect();
        const admin = await Admin.findOne({ email });
        if (admin) {
            return NextResponse.json({ message: "SuperAdmin found" }, { status: 200 });
        } else {
            return NextResponse.json({ message: "SuperAdmin not found" }, { status: 404 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Error retrieving SuperAdmin" }, { status: 500 });
    }
};

export async function POST(req) {
    const { email, role } = await req.json();

    if (!email || !role) {
        return NextResponse.json(
            { message: "Email and role are required" },
            { status: 400 }
        );
    }

    try {
        switch (role) {
            case 'mentor':
                return await checkMentorEmail(email);
            case 'mentee':
                return await checkMenteeEmail(email);
            case 'admin':
                return await checkAdminEmail(email);
            case 'superadmin':
                return await checkSuperAdminEmail(email);
            default:
                return NextResponse.json(
                    { message: "Invalid role" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Error checking email" },
            { status: 500 }
        );
    }
}