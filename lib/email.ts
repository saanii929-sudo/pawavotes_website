// Email service utility using nodemailer
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error: any) {
    return false;
  }
}

export async function sendNomineeApprovalEmail(
  email: string,
  name: string,
  nomineeCode: string,
  awardName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .code-box { background: white; border: 2px solid #16a34a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 2px; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
          <h2>Dear ${name},</h2>
          <p>We are thrilled to inform you that your nomination for <strong>${awardName}</strong> has been approved!</p>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your Nominee Code</p>
            <div class="code">${nomineeCode}</div>
          </div>
          
          <p>Your nominee code is your unique identifier for this award program. Please keep it safe as you may need it for future reference.</p>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Your profile is now live and visible to voters</li>
            <li>Share your nomination with friends and family</li>
            <li>Encourage supporters to vote for you</li>
          </ul>
          
          <p>We wish you the very best of luck in the competition!</p>
          
          <p>Best regards,<br>The Awards Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Congratulations ${name}!
    
    Your nomination for ${awardName} has been approved.
    
    Your Nominee Code: ${nomineeCode}
    
    Your profile is now live and visible to voters. Share your nomination with friends and family and encourage them to vote for you.
    
    Best of luck!
    The Awards Team
  `;

  return sendEmail({
    to: email,
    subject: `🎉 Nomination Approved - ${awardName}`,
    html,
    text,
  });
}
