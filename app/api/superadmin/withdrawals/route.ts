import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only superadmin can access this
    if (decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin only.' },
        { status: 403 }
      );
    }

    // Get all transfers
    const transfers = await Transfer.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: transfers,
    });
  } catch (error: any) {
    console.error('Get withdrawals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawals', details: error.message },
      { status: 500 }
    );
  }
}
