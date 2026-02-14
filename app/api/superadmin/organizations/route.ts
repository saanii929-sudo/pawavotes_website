import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';

// GET all organizations
async function getOrganizations(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: error.message },
      { status: 500 }
    );
  }
}

// POST create new organization
async function createOrganization(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, password, phone, address, website, description, eventType, status } = body;

    console.log('Creating organization with data:', { name, email, eventType, status });

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ email });
    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create organization
    const organization = await Organization.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      website,
      description,
      eventType: eventType || 'awards',
      status: status || 'active',
      createdBy: (req as any).user?.id || 'superadmin',
    });

    console.log('Organization created successfully:', organization._id, 'eventType:', organization.eventType);

    const orgData = organization.toObject();
    delete orgData.password;

    return NextResponse.json({
      success: true,
      message: 'Organization created successfully',
      data: orgData,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'Failed to create organization', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getOrganizations, 'superadmin');
export const POST = withAuth(createOrganization, 'superadmin');
