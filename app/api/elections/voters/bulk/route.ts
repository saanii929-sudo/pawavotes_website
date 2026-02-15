import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

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
      await Voter.insertMany(votersToCreate);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${results.success.length} voters`,
      data: {
        total: voters.length,
        successful: results.success.length,
        failed: results.failed.length,
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
