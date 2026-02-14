import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { fullName, email, subject, message } = body;

    // Validate required fields
    if (!fullName || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create contact submission
    const contact = await Contact.create({
      fullName,
      email,
      subject,
      message,
    });

    return NextResponse.json(
      {
        message: 'Contact form submitted successfully',
        contact: {
          id: contact._id,
          fullName: contact.fullName,
          email: contact.email,
          subject: contact.subject,
          createdAt: contact.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Contact form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}
