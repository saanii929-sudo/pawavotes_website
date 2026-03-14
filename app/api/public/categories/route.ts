import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import { sanitizeSearch } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');
    const search = sanitizeSearch(searchParams.get('search'));

    if (!awardId) {
      return NextResponse.json(
        { error: 'Award ID is required' },
        { status: 400 }
      );
    }

    let query: any = {
      awardId,
      isPublished: true,
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const categories = await Category.find(query)
      .select('name description price nomineeCount voteCount')
      .sort({ order: 1, name: 1 })
      .lean();

    // Get actual nominee count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const nomineeCount = await Nominee.countDocuments({
          categoryId: category._id.toString(),
          status: 'published',
        });

        return {
          ...category,
          nomineeCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      categories: categoriesWithCounts,
    });
  } catch (error: any) {
    console.error('Get public categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
