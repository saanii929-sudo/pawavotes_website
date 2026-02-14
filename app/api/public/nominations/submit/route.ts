import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import Category from '@/models/Category';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { awardId, categoryId, name, email, phone, bio, image } = body;

    // Validate required fields
    if (!awardId || !categoryId || !name || !email) {
      return NextResponse.json(
        { error: 'Award ID, Category ID, name, and email are required' },
        { status: 400 }
      );
    }

    // Verify award exists and nominations are enabled
    const award = await Award.findById(awardId);
    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    if (!award.nomination?.enabled) {
      return NextResponse.json(
        { error: 'Nominations are not enabled for this award' },
        { status: 400 }
      );
    }

    // Check if nominations are open
    const now = new Date();
    if (award.nomination.startDate && award.nomination.endDate) {
      const startDate = new Date(award.nomination.startDate);
      const endDate = new Date(award.nomination.endDate);
      
      if (now < startDate || now > endDate) {
        return NextResponse.json(
          { error: 'Nominations are not open at this time' },
          { status: 400 }
        );
      }
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Create nominee (self-nomination - pending approval)
    const nominee = await Nominee.create({
      name,
      email,
      phone,
      awardId,
      categoryId,
      image: image || undefined,
      bio: bio || undefined,
      status: 'draft', // Draft status until admin approves
      nominationStatus: 'pending', // Pending approval
      nominationType: 'self', // Self-nomination
      voteCount: 0,
      // nomineeCode will be generated upon approval
    });

    // Update category nominee count
    await Category.findByIdAndUpdate(categoryId, {
      $inc: { nomineeCount: 1 },
    });

    // Update award nominee count
    await Award.findByIdAndUpdate(awardId, {
      $inc: { totalNominees: 1 },
    });

    return NextResponse.json({
      success: true,
      nominee,
      message: 'Nomination submitted successfully',
    });
  } catch (error: any) {
    console.error('Submit nomination error:', error);
    return NextResponse.json(
      { error: 'Failed to submit nomination', details: error.message },
      { status: 500 }
    );
  }
}
