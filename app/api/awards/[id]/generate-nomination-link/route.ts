import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';

async function generateNominationLink(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { id } = await params;

    let query: any = { _id: id };
    
    // If org-admin, check if they have access to this award
    if (user.role === 'org-admin') {
      if (!user.assignedAwards || !user.assignedAwards.includes(id)) {
        return NextResponse.json(
          { error: 'You do not have access to this award' },
          { status: 403 }
        );
      }
    } else {
      // Organization owner can only update their own awards
      query.organizationId = user.id;
    }

    console.log('Updating award with query:', query);

    // First, get the current award to preserve existing settings
    const currentAward = await Award.findOne(query);
    
    if (!currentAward) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    // Update the award to mark nomination link as generated
    const award = await Award.findOneAndUpdate(
      query,
      { 
        $set: {
          'settings.nominationLinkGenerated': true
        }
      },
      { new: true, runValidators: false }
    );

    console.log('Updated award:', award?._id);
    console.log('Award settings after update:', award?.settings);

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    // Generate the nomination link
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const nominationLink = `${baseUrl}/nominate/${award._id}`;

    return NextResponse.json({
      success: true,
      nominationLink,
      message: 'Nomination link generated successfully',
      settings: award.settings, // Return the updated settings for debugging
    });
  } catch (error: any) {
    console.error('Generate nomination link error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nomination link', details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateNominationLink);
