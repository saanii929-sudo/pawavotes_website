import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// Generate unique 8-character alphanumeric token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Generate 6-digit password
function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if token is unique
async function generateUniqueToken(): Promise<string> {
  let token = generateToken();
  let exists = await Voter.findOne({ token });
  
  while (exists) {
    token = generateToken();
    exists = await Voter.findOne({ token });
  }
  
  return token;
}

// GET all voters for an election
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    // Verify election belongs to organization
    const election = await Election.findOne({
      _id: electionId,
      organizationId: decoded.id,
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    const voters = await Voter.find({ electionId }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: voters,
    });
  } catch (error: any) {
    console.error('Get voters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voters', details: error.message },
      { status: 500 }
    );
  }
}

// POST add single voter
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { electionId, name, email, phone, voterId, metadata } = body;

    if (!electionId || !name) {
      return NextResponse.json(
        { error: 'Election ID and name are required' },
        { status: 400 }
      );
    }

    // Verify election belongs to organization
    const election = await Election.findOne({
      _id: electionId,
      organizationId: decoded.id,
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Generate unique token and password
    const voterToken = await generateUniqueToken();
    const password = generatePassword();
    const hashedPassword = await hashPassword(password);

    // Create voter
    const voter = await Voter.create({
      electionId,
      organizationId: decoded.id,
      name,
      email,
      phone,
      voterId,
      token: voterToken,
      password: hashedPassword,
      metadata: metadata || {},
      status: 'active',
      hasVoted: false,
    });

    // Send credentials via email if email provided
    if (email) {
      try {
        await sendVoterCredentials(email, name, voterToken, password, election.title);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Return voter data with plain password (only shown once)
    const voterData: any = voter.toObject();
    delete voterData.password;

    return NextResponse.json({
      success: true,
      message: 'Voter added successfully',
      data: {
        ...voterData,
        plainPassword: password, // Only returned on creation
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Add voter error:', error);
    return NextResponse.json(
      { error: 'Failed to add voter', details: error.message },
      { status: 500 }
    );
  }
}

// Send voter credentials via email
async function sendVoterCredentials(
  email: string,
  name: string,
  token: string,
  password: string,
  electionTitle: string
): Promise<boolean> {
  // Get the base URL from environment or use default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/election/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials-box { background: white; border: 2px solid #9333ea; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .credential-item { margin: 15px 0; }
        .credential-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
        .credential-value { font-size: 24px; font-weight: bold; color: #9333ea; font-family: monospace; letter-spacing: 2px; }
        .button { display: inline-block; background: #9333ea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .button:hover { background: #7e22ce; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .info-box { background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗳️ Your Voting Credentials</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>You have been registered as a voter for <strong>${electionTitle}</strong>.</p>
          
          <div class="credentials-box">
            <p style="text-align: center; margin-bottom: 20px; color: #6b7280;">Your Login Credentials</p>
            
            <div class="credential-item">
              <div class="credential-label">Voter Token</div>
              <div class="credential-value">${token}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button" style="color: white;">
              🗳️ Go to Voting Portal
            </a>
          </div>

          <div class="info-box">
            <strong>📍 Voting Portal URL:</strong><br>
            <a href="${loginUrl}" style="color: #6366f1; word-break: break-all;">${loginUrl}</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Keep these credentials safe. You will need them to cast your vote. These credentials will expire after you vote.
          </div>
          
          <p><strong>How to Vote:</strong></p>
          <ol>
            <li>Click the button above or visit the voting portal link</li>
            <li>Enter your token and password</li>
            <li>Review the candidates and cast your vote</li>
            <li>Submit your ballot</li>
          </ol>
          
          <p style="margin-top: 30px;">If you have any questions or issues, please contact the election organizers.</p>
          
          <p>Best regards,<br>Election Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>Your credentials are confidential. Do not share them with anyone.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${name},
    
    You have been registered as a voter for ${electionTitle}.
    
    Your Login Credentials:
    Token: ${token}
    Password: ${password}
    
    Voting Portal: ${loginUrl}
    
    Keep these credentials safe. You will need them to cast your vote.
    These credentials will expire after you vote.
    
    How to Vote:
    1. Visit the voting portal: ${loginUrl}
    2. Enter your token and password
    3. Review the candidates and cast your vote
    4. Submit your ballot
    
    If you have any questions, please contact the election organizers.
    
    Best regards,
    Election Management Team
  `;

  return sendEmail({
    to: email,
    subject: `Your Voting Credentials - ${electionTitle}`,
    html,
    text,
  });
}