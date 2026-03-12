import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { verifyToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Only super admins can reject transfers' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const transferId = params.id;
    const transfer = await Transfer.findById(transferId);

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: `Transfer is already ${transfer.status}` },
        { status: 400 }
      );
    }

    transfer.status = 'rejected';
    transfer.rejectedBy = decoded.email || decoded.id;
    transfer.rejectedAt = new Date();
    transfer.rejectionReason = reason;
    await transfer.save();

    console.log('Transfer rejected:', {
      transferId,
      referenceId: transfer.referenceId,
      amount: transfer.amount,
      rejectedBy: decoded.email,
      reason,
    });

    // TODO: Send rejection email to organizer

    return NextResponse.json({
      success: true,
      message: 'Transfer rejected successfully',
      data: transfer,
    });
  } catch (error: any) {
    console.error('Transfer rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject transfer', details: error.message },
      { status: 500 }
    );
  }
}
