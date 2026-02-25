import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { sendEmail } from '@/lib/email';

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

    // Send email notification to admin
    const adminEmail = process.env.SMTP_FROM || 'pawavotes@gmail.com';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
          .message-box { background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .label { font-weight: bold; color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
          </div>
          <div class="content">
            <p>You have received a new message from the Pawavotes contact form.</p>
            
            <div class="info-box">
              <p><span class="label">From:</span> ${fullName}</p>
              <p><span class="label">Email:</span> ${email}</p>
              <p><span class="label">Subject:</span> ${subject}</p>
              <p><span class="label">Submitted:</span> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="message-box">
              <p class="label">Message:</p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p><strong>Reply to:</strong> <a href="mailto:${email}">${email}</a></p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Pawavotes Contact Form</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      New Contact Form Submission
      
      From: ${fullName}
      Email: ${email}
      Subject: ${subject}
      Submitted: ${new Date().toLocaleString()}
      
      Message:
      ${message}
      
      Reply to: ${email}
    `;

    // Send email notification
    const emailSent = await sendEmail({
      to: adminEmail,
      subject: `Contact Form: ${subject}`,
      html: emailHtml,
      text: emailText,
    });

    if (!emailSent) {
      console.warn('Email notification failed, but contact was saved to database');
    }

    // Send confirmation email to user
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Message Received</h1>
          </div>
          <div class="content">
            <h2>Thank you, ${fullName}!</h2>
            <p>We have received your message and will get back to you as soon as possible.</p>
            
            <p><strong>Your message:</strong></p>
            <p style="background: white; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </p>
            
            <p>Our team typically responds within 24-48 hours during business days.</p>
            
            <p>Best regards,<br>The Pawavotes Team</p>
          </div>
          <div class="footer">
            <p>Pawavotes - Trusted Digital Voting Platform</p>
            <p>📧 pawavotes@gmail.com | 📞 +233 55 273 2025</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const confirmationText = `
      Thank you, ${fullName}!
      
      We have received your message and will get back to you as soon as possible.
      
      Your message:
      ${message}
      
      Our team typically responds within 24-48 hours during business days.
      
      Best regards,
      The Pawavotes Team
      
      pawavotes@gmail.com | +233 55 273 2025
    `;

    // Send confirmation to user (don't fail if this doesn't work)
    await sendEmail({
      to: email,
      subject: 'Thank you for contacting Pawavotes',
      html: confirmationHtml,
      text: confirmationText,
    }).catch(err => console.warn('Failed to send confirmation email:', err));

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
