import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
import { sendNomineeApprovalEmail } from '@/lib/email';

// Generate award code from name (e.g., "Ghana Music Awards" -> "GMA")
// Numbers in the name are excluded (e.g., "Ghana Music Awards 2024" -> "GMA")
function generateAwardCode(name: string): string {
  // Split by spaces and filter out words that are purely numeric
  const words = name.trim().split(/\s+/).filter(word => !/^\d+$/.test(word));
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

  // Get all nominees with codes for this award
  const nominees = await Nominee.find({
    awardId,
    nomineeCode: { $exists: true, $ne: null },
  }).select('nomineeCode');

  let maxNumber = 0;

  // Extract all numbers and find the maximum
  nominees.forEach(nominee => {
    if (nominee.nomineeCode) {
      const match = nominee.nomineeCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
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
    const nomineeCode = await generateNomineeCode((nominee.awardId as any)._id);
    nominee.nominationStatus = 'accepted';
    nominee.status = 'published';
    nominee.nomineeCode = nomineeCode;
    await nominee.save();
    
    // Send approval email
    if (nominee.email) {
      console.log('Attempting to send approval email to:', nominee.email);
      const emailSent = await sendNomineeApprovalEmail(
        nominee.email,
        nominee.name,
        nomineeCode,
        (nominee.awardId as any).name
      );
      
      if (emailSent) {
        console.log('Approval email sent successfully to:', nominee.email);
      } else {
        console.error('Failed to send approval email to:', nominee.email);
      }
    } else {
      console.log('No email address found for nominee:', nominee.name);
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
