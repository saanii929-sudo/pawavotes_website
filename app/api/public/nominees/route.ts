import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const awardId = searchParams.get('awardId');
    const search = searchParams.get('search');

    if (!categoryId && !awardId) {
      return NextResponse.json(
        { error: 'Category ID or Award ID is required' },
        { status: 400 }
      );
    }

    let query: any = {
      status: 'published',
    };

    if (categoryId) {
      query.categoryId = categoryId;
    } else if (awardId) {
      query.awardId = awardId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nomineeCode: { $regex: search, $options: 'i' } }
      ];
    }

    const nominees = await Nominee.find(query)
      .select('name nomineeCode image bio voteCount categoryId')
      .sort({ voteCount: -1, name: 1 })
      .lean();

    // Get category names
    const nomineesWithCategory = await Promise.all(
      nominees.map(async (nominee) => {
        const category = await Category.findById(nominee.categoryId).select('name').lean();
        return {
          ...nominee,
          categoryName: category?.name || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      success: true,
      nominees: nomineesWithCategory,
    });
  } catch (error: any) {
    console.error('Get public nominees error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nominees', details: error.message },
      { status: 500 }
    );
  }
}
