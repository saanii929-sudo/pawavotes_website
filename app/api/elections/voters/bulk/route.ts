import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendVoterCredentialsSms } from '@/services/sms.service';

// Generate unique 8-character alphanumeric token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Generate 8-character password with uppercase, lowercase, and numbers
// Excludes confusing characters: l, L, I, i, O, o, 0, 1
function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // Excluded: I, L, O
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Excluded: i, l, o
  const numbers = '23456789'; // Excluded: 0, 1
  const allChars = uppercase + lowercase + numbers;
  
  let password = '';
  
  // Ensure at least one uppercase letter
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  
  // Ensure at least one lowercase letter
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  
  // Ensure at least one number
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill remaining 5 characters randomly
  for (let i = 0; i < 5; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password to randomize position of guaranteed characters
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Send voter credentials via email
async function sendVoterCredentials(
  email: string,
  name: string,
  token: string,
  password: string,
  electionTitle: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/election/login`;

  // Format dates
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const startDateFormatted = formatDate(startDate);
  const endDateFormatted = formatDate(endDate);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials-box { background: white; border: 2px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .credential-item { margin: 15px 0; }
        .credential-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
        .credential-value { font-size: 24px; font-weight: bold; color: #16a34a; font-family: monospace; letter-spacing: 2px; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .info-box { background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
        .date-box { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
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
          
          <div class="date-box">
            <p style="margin: 0; font-size: 14px;"><strong>📅 Election Period:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">
              <strong>Start:</strong> ${startDateFormatted}<br>
              <strong>End:</strong> ${endDateFormatted}
            </p>
          </div>
          
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
            <strong>⚠️ Important:</strong> Keep these credentials safe. You will need them to cast your vote.
          </div>
          
          <p><strong>How to Vote:</strong></p>
          <ol>
            <li>Visit the voting portal and enter your credentials</li>
            <li>Review the candidates and cast your vote</li>
            <li>Submit your ballot</li>
          </ol>
          
          <p style="margin-top: 30px;">If you have any questions, please contact the election organizers.</p>
          
          <p>Best regards,<br>Election Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${name},
    
    You have been registered as a voter for ${electionTitle}.
    
    ELECTION PERIOD:
    Start: ${startDateFormatted}
    End: ${endDateFormatted}
    
    Your Login Credentials:
    Token: ${token}
    Password: ${password}
    
    Voting Portal: ${loginUrl}
    
    Keep these credentials safe. You will need them to cast your vote.
    
    Best regards,
    Election Management Team
  `;

  try {
    return await sendEmail({
      to: email,
      subject: `Your Voting Credentials - ${electionTitle}`,
      html,
      text,
    });
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    return false;
  }
}

// Check if token is unique
async function generateUniqueToken(existingTokens: Set<string>): Promise<string> {
  let token = generateToken();
  
  while (existingTokens.has(token) || await Voter.findOne({ token })) {
    token = generateToken();
  }
  
  existingTokens.add(token);
  return token;
}

// POST bulk upload voters
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
    const { electionId, voters } = body;

    if (!electionId || !voters || !Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json(
        { error: 'Election ID and voters array are required' },
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

    const existingTokens = new Set<string>();
    const votersToCreate = [];
    const results: {
      success: Array<{
        row: number;
        name: string;
        token: string;
        password: string;
        email?: string;
      }>;
      failed: Array<{
        row: number;
        data: any;
        error: string;
      }>;
    } = {
      success: [],
      failed: [],
    };

    // Process each voter
    for (let i = 0; i < voters.length; i++) {
      const voterData = voters[i];
      
      try {
        // Validate required fields
        if (!voterData.name) {
          results.failed.push({
            row: i + 1,
            data: voterData,
            error: 'Name is required',
          });
          continue;
        }

        // Generate unique token and password
        const voterToken = await generateUniqueToken(existingTokens);
        const password = generatePassword();
        const hashedPassword = await hashPassword(password);

        votersToCreate.push({
          electionId,
          organizationId: decoded.id,
          name: voterData.name,
          email: voterData.email || null,
          phone: voterData.phone || null,
          voterId: voterData.voterId || null,
          token: voterToken,
          password: hashedPassword,
          metadata: {
            department: voterData.department || null,
            class: voterData.class || null,
            studentId: voterData.studentId || null,
            plainPassword: password, // Store plain password for resending
            ...voterData.metadata,
          },
          status: 'active',
          hasVoted: false,
        });

        results.success.push({
          row: i + 1,
          name: voterData.name,
          token: voterToken,
          password: password, // Plain password for download
          email: voterData.email,
          phone: voterData.phone,
        });
      } catch (error: any) {
        results.failed.push({
          row: i + 1,
          data: voterData,
          error: error.message,
        });
      }
    }

    // Bulk insert voters
    if (votersToCreate.length > 0) {
      try {
        await Voter.insertMany(votersToCreate, { ordered: false });
      } catch (bulkError: any) {
        // Handle duplicate key errors in bulk insert
        if (bulkError.code === 11000 && bulkError.writeErrors) {
          bulkError.writeErrors.forEach((writeError: any) => {
            const failedVoter = votersToCreate[writeError.index];
            const field = Object.keys(writeError.err.keyPattern || {})[0];
            let errorMsg = 'Duplicate entry';
            
            if (field === 'email') {
              errorMsg = `Email ${failedVoter.email} is already registered`;
            } else if (field === 'phone') {
              errorMsg = `Phone ${failedVoter.phone} is already registered`;
            } else if (field === 'token') {
              errorMsg = 'Token conflict';
            }
            
            // Find the corresponding success entry and move to failed
            const successIndex = results.success.findIndex(
              s => s.token === failedVoter.token
            );
            if (successIndex !== -1) {
              const failedEntry = results.success.splice(successIndex, 1)[0];
              results.failed.push({
                row: failedEntry.row,
                data: failedVoter,
                error: errorMsg,
              });
            }
          });
        }
      }
    }

    // Send emails and SMS to all successfully created voters
    let emailsSent = 0;
    let emailsFailed = 0;
    let smsSent = 0;
    let smsFailed = 0;
    
    if (results.success.length > 0) {
      console.log(`Sending notifications to ${results.success.length} voters...`);
      
      for (const voter of results.success) {
        // Send email if available
        if (voter.email) {
          try {
            const emailSent = await sendVoterCredentials(
              voter.email,
              voter.name,
              voter.token,
              voter.password,
              election.title,
              election.startDate,
              election.endDate
            );
            
            if (emailSent) {
              emailsSent++;
            } else {
              emailsFailed++;
            }
          } catch (emailError) {
            console.error(`Failed to send email to ${voter.email}:`, emailError);
            emailsFailed++;
          }
        }

        // Send SMS if available
        if (voter.phone) {
          try {
            const smsSentSuccess = await sendVoterCredentialsSms(
              voter.phone,
              voter.name,
              voter.token,
              voter.password,
              election.title,
              election.startDate,
              election.endDate
            );
            
            if (smsSentSuccess) {
              smsSent++;
            } else {
              smsFailed++;
            }
          } catch (smsError) {
            console.error(`Failed to send SMS to ${voter.phone}:`, smsError);
            smsFailed++;
          }
        }
      }
      
      console.log(`Emails sent: ${emailsSent}, failed: ${emailsFailed}`);
      console.log(`SMS sent: ${smsSent}, failed: ${smsFailed}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${results.success.length} voters. Emails: ${emailsSent} sent${emailsFailed > 0 ? `, ${emailsFailed} failed` : ''}. SMS: ${smsSent} sent${smsFailed > 0 ? `, ${smsFailed} failed` : ''}`,
      data: {
        total: voters.length,
        successful: results.success.length,
        failed: results.failed.length,
        emailsSent,
        emailsFailed,
        smsSent,
        smsFailed,
        voters: results.success,
        errors: results.failed,
      },
    });
  } catch (error: any) {
    console.error('Bulk upload voters error:', error);
    return NextResponse.json(
      { error: 'Failed to upload voters', details: error.message },
      { status: 500 }
    );
  }
}
