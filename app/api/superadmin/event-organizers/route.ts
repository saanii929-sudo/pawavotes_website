import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventOrganizer from '@/models/EventOrganizer';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';
import { sanitizeSearch } from '@/lib/security';

async function listEventOrganizers(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = sanitizeSearch(searchParams.get('search'));
    const status = searchParams.get('status') || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [organizers, total] = await Promise.all([
      EventOrganizer.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EventOrganizer.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: organizers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch event organizers' }, { status: 500 });
  }
}

async function createEventOrganizer(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, phone, deliveryMethod } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (!deliveryMethod || !['email', 'sms', 'both'].includes(deliveryMethod)) {
      return NextResponse.json({ error: 'Delivery method is required (email, sms, or both)' }, { status: 400 });
    }

    if ((deliveryMethod === 'sms' || deliveryMethod === 'both') && !phone) {
      return NextResponse.json({ error: 'Phone number is required for SMS delivery' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await EventOrganizer.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: 'An event organizer with this email already exists' }, { status: 400 });
    }

    const generatedPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    const organizer = await EventOrganizer.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim(),
      status: 'active',
      createdBy: (req as any).user?.id || 'superadmin',
    });

    const deliveryResults = {
      email: { sent: false, error: null as string | null },
      sms: { sent: false, error: null as string | null },
    };

    const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    if (deliveryMethod === 'email' || deliveryMethod === 'both') {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '465'),
          secure: true,
          auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: normalizedEmail,
          subject: 'Welcome to PawaVotes – Event Organizer Account',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#16a34a;">Welcome to PawaVotes!</h2>
              <p>Hello ${name},</p>
              <p>Your <strong>Event Organizer</strong> account has been created. Here are your login credentials:</p>
              <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
                <p style="margin:5px 0;"><strong>Email:</strong> ${normalizedEmail}</p>
                <p style="margin:5px 0;"><strong>Password:</strong> ${generatedPassword}</p>
                <p style="margin:5px 0;"><strong>Login URL:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
                <p style="margin:5px 0;"><strong>Account Type:</strong> Event Organizer</p>
              </div>
              <p style="color:#dc2626;"><strong>Important:</strong> Please change your password after your first login.</p>
              <p>Best regards,<br>PawaVotes Team</p>
            </div>
          `,
        });
        deliveryResults.email.sent = true;
      } catch (e: any) {
        deliveryResults.email.error = e.message;
      }
    }

    if (deliveryMethod === 'sms' || deliveryMethod === 'both') {
      try {
        const { sendSms } = require('@/services/sms.service');
        const result = await sendSms({
          to: phone,
          message: `Welcome to PawaVotes! Event Organizer account created.\nEmail: ${normalizedEmail}\nPassword: ${generatedPassword}\nLogin: ${appUrl}/login`,
        });
        deliveryResults.sms.sent = result.success;
        if (!result.success) deliveryResults.sms.error = result.error || 'SMS failed';
      } catch (e: any) {
        deliveryResults.sms.error = e.message;
      }
    }

    const orgData: any = organizer.toObject();
    delete orgData.password;

    return NextResponse.json(
      {
        success: true,
        message: 'Event organizer created successfully',
        data: { ...orgData, generatedPassword },
        delivery: deliveryResults,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create event organizer', details: error.message }, { status: 500 });
  }
}

function generateSecurePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '!@#$%^&*';
  const all = upper + lower + nums + syms;
  let pw = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + nums[Math.floor(Math.random() * nums.length)]
    + syms[Math.floor(Math.random() * syms.length)];
  for (let i = pw.length; i < 12; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

export const GET = withAuth(listEventOrganizers, 'superadmin');
export const POST = withAuth(createEventOrganizer, 'superadmin');
