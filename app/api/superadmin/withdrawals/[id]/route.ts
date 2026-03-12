import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { verifyToken } from '@/lib/auth';

// This endpoint is deprecated - use /api/admin/transfers/[id]/approve instead
// Kept for backward compatibility with old superadmin withdrawals page

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only superadmin can update withdrawal status
    if (decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin only.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !['completed', 'failed', 'approved'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (approved, completed, or failed)' },
        { status: 400 }
      );
    }

    const transfer = await Transfer.findById(id);

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending transfers can be updated' },
        { status: 400 }
      );
    }

    // Update transfer status
    transfer.status = status;
    
    if (status === 'failed') {
      transfer.notes = transfer.notes ? `${transfer.notes} | Rejected by admin` : 'Rejected by admin';
    } else if (status === 'approved') {
      transfer.notes = transfer.notes ? `${transfer.notes} | Approved by admin` : 'Approved by admin';
    } else if (status === 'completed') {
      transfer.notes = transfer.notes ? `${transfer.notes} | Completed by admin` : 'Completed by admin';
    }
    
    await transfer.save();

    console.log(`Transfer ${id} updated to ${status} by superadmin`);

    return NextResponse.json({
      success: true,
      message: `Transfer ${status}`,
      data: transfer,
    });
  } catch (error: any) {
    console.error('Update withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to update withdrawal', details: error.message },
      { status: 500 }
    );
  }
}
