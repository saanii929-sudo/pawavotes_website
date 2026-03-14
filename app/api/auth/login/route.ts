import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { verifyPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`login:${ip}`, 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { email, password, userType } = body;
    
    if (!email || !password || !userType) {
      return NextResponse.json(
        { error: 'Email, password, and user type are required' },
        { status: 400 }
      );
    }

    let user;
    let role;

    if (userType === 'admin' || userType === 'superadmin') {
      user = await Admin.findOne({ email, status: 'active' });
      role = user?.role;
    } else if (userType === 'organization') {
      user = await Organization.findOne({ email, status: 'active' });
      role = 'organization';
    } else if (userType === 'org-admin') {
      user = await OrganizationAdmin.findOne({ email, status: 'active' }).populate('organizationId', 'name');
      role = 'org-admin';
    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
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
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
