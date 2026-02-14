import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { withAuth } from '@/middleware/auth';

async function getCurrentUser(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let userData: any = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Fetch full user data based on role
    if (user.role === 'organization') {
      const organization = await Organization.findById(user.id).select('-password');
      if (organization) {
        userData = {
          ...userData,
          name: organization.name,
          email: organization.email,
          phone: organization.phone,
          address: organization.address,
          website: organization.website,
          description: organization.description,
          logo: organization.logo,
          status: organization.status,
        };
      }
    } else if (user.role === 'org-admin') {
      const orgAdmin = await OrganizationAdmin.findById(user.id)
        .populate('organizationId', 'name email phone logo')
        .select('-password');
      
      if (orgAdmin) {
        userData = {
          ...userData,
          name: orgAdmin.username,
          email: orgAdmin.email,
          organizationId: orgAdmin.organizationId._id,
          organizationName: orgAdmin.organizationId.name,
          assignedAwards: orgAdmin.assignedAwards,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCurrentUser);
