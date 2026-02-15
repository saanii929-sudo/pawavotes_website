import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    console.log('=== LOGIN API CALLED ===');
    await connectDB();
    console.log('✅ MongoDB connected');

    const body = await req.json();
    const { email, password, userType } = body;
    
    console.log('Request body:', { email, password: password, passwordLength: password?.length, userType });
    console.log('Password bytes:', Buffer.from(password || '').toString('hex'));

    if (!email || !password || !userType) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Email, password, and user type are required' },
        { status: 400 }
      );
    }

    let user;
    let role;

    console.log('Looking for user with email:', email, 'userType:', userType);

    if (userType === 'admin' || userType === 'superadmin') {
      user = await Admin.findOne({ email, status: 'active' });
      console.log('Admin query result:', user ? 'Found' : 'Not found');
      if (user) {
        console.log('Admin details:', { id: user._id, email: user.email, role: user.role, status: user.status });
      }
      role = user?.role;
    } else if (userType === 'organization') {
      user = await Organization.findOne({ email, status: 'active' });
      console.log('Organization query result:', user ? 'Found' : 'Not found');
      role = 'organization';
    } else if (userType === 'org-admin') {
      // Organization admin login
      user = await OrganizationAdmin.findOne({ email, status: 'active' }).populate('organizationId', 'name');
      console.log('Organization Admin query result:', user ? 'Found' : 'Not found');
      role = 'org-admin';
    } else {
      console.log('❌ Invalid user type:', userType);
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('Verifying password...');
    const isValidPassword = await verifyPassword(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: role,
      eventType: role === 'organization' ? (user as any).eventType : undefined,
      organizationId: role === 'org-admin' ? (user as any).organizationId._id : undefined,
      assignedAwards: role === 'org-admin' ? (user as any).assignedAwards : undefined,
    });

    console.log('✅ Login successful');
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: (user as any).username || (user as any).name,
        role: role,
        eventType: role === 'organization' ? (user as any).eventType : undefined,
        organizationId: role === 'org-admin' ? (user as any).organizationId._id : undefined,
        organizationName: role === 'org-admin' ? (user as any).organizationId.name : undefined,
        assignedAwards: role === 'org-admin' ? (user as any).assignedAwards : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error.message },
      { status: 500 }
    );
  }
}
