import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HelpDeskUser from '@/models/HelpDeskUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await HelpDeskUser.findOne({ email, status: 'active' })
      .populate('assignedElections', 'title');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials or account not found' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        organizationId: user.organizationId,
        assignedElections: user.assignedElections.map((e: any) => e._id),
      },
      JWT_SECRET,
      { expiresIn: '6h' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        assignedElections: user.assignedElections,
      },
    });
  } catch (error) {
    console.error('Helpdesk login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
