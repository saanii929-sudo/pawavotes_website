import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import mongoose from 'mongoose';
import { sanitizeSearch } from '@/lib/security';

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

    // Search by award name, code, or ID (only if valid ObjectId)
    if (search) {
      const escaped = sanitizeSearch(search);
      const searchConditions: any[] = [
        { name: { $regex: escaped, $options: 'i' } },
        { code: { $regex: escaped, $options: 'i' } },
      ];
      
      // Only search by _id if the search term is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(search) && search.length === 24) {
        searchConditions.push({ _id: search });
      }
      
      query.$or = searchConditions;
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
      { error: 'Failed to fetch awards', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
