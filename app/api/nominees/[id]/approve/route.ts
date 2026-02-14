import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
import { sendNomineeApprovalEmail } from '@/lib/email';

function generateAwardCode(name: string): string {
  const words = name.trim().split(/\s+/);
  const code = words.map(word => word.charAt(0).toUpperCase()).join('');
  return code;
}

async function generateNomineeCode(awardId: string): Promise<string> {
  const award = await Award.findById(awardId);
  if (!award) {
    throw new Error('Award not found');
  }

  if (!award.code) {
    const newCode = generateAwardCode(award.name);
    await Award.findByIdAndUpdate(awardId, { code: newCode }, { runValidators: false });
    award.code = newCode;
  }

  const lastNominee = await Nominee.findOne({
    awardId,
    nomineeCode: { $exists: true, $ne: null },
  })
    .sort({ nomineeCode: -1 })
    .select('nomineeCode');

  let nextNumber = 1;

  if (lastNominee && lastNominee.nomineeCode) {
    const match = lastNominee.nomineeCode.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  const formattedNumber = nextNumber.toString().padStart(3, '0');
  return `${award.code}${formattedNumber}`;
}

async function approveNominee(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;

    const nominee = await Nominee.findById(id).populate('awardId', 'name code');
    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found' },
        { status: 404 }
      );
    }

    if (nominee.nominationStatus === 'accepted') {
      return NextResponse.json(
        { error: 'Nominee is already approved' },
        { status: 400 }
      );
    }
    const nomineeCode = await generateNomineeCode(nominee.awardId._id);
    nominee.nominationStatus = 'accepted';
    nominee.status = 'published';
    nominee.nomineeCode = nomineeCode;
    await nominee.save();
    if (nominee.email) {
      await sendNomineeApprovalEmail(
        nominee.email,
        nominee.name,
        nomineeCode,
        nominee.awardId.name
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Nominee approved successfully',
      data: nominee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to approve nominee', details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(approveNominee);
