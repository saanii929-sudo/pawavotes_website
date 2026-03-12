import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * Verify user password
 * Used for sensitive operations like transfers
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Get token from authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get password from request body
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Find user based on role
    let user;
    if (decoded.role === 'organization') {
      user = await Organization.findById(decoded.id).select('password');
    } else if (decoded.role === 'org-admin') {
      user = await OrganizationAdmin.findById(decoded.id).select('password');
    } else {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid password' 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password verified successfully',
    });
  } catch (error: any) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify password', details: error.message },
      { status: 500 }
    );
  }
}
