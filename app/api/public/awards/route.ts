import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'active';

    let query: any = {
      status: { $in: ['active', 'voting'] },
      'settings.allowPublicVoting': true,
    };

    // Search by award name, code, or ID
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { _id: search },
      ];
    }

    const awards = await Award.find(query)
      .select('name code description organizationName startDate endDate votingStartDate votingEndDate votingStartTime votingEndTime status banner logo totalVotes totalNominees categories nomination settings pricing')
      .sort({ createdAt: -1 })
      .lean();

    // Get category count for each award
    const awardsWithDetails = await Promise.all(
      awards.map(async (award) => {
        const categoryCount = await Category.countDocuments({
          awardId: award._id.toString(),
          isPublished: true,
        });

        return {
          ...award,
          categories: categoryCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      awards: awardsWithDetails,
    });
  } catch (error: any) {
    console.error('Get public awards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch awards', details: error.message },
      { status: 500 }
    );
  }
}
