import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import Category from '@/models/Category';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { stripHtml } from '@/lib/sanitize';
import { isValidObjectId } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`nom-submit:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

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

    // Validate ObjectIds
    if (!isValidObjectId(awardId) || !isValidObjectId(categoryId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Sanitize and validate inputs
    const sanitizedName = stripHtml(String(name)).slice(0, 200);
    const sanitizedEmail = stripHtml(String(email)).slice(0, 254).toLowerCase();
    const sanitizedPhone = phone ? stripHtml(String(phone)).slice(0, 20) : undefined;
    const sanitizedBio = bio ? stripHtml(String(bio)).slice(0, 2000) : undefined;
    const sanitizedImage = image ? stripHtml(String(image)).slice(0, 500) : undefined;

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!sanitizedName || sanitizedName.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
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
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      awardId,
      categoryId,
      image: sanitizedImage || undefined,
      bio: sanitizedBio || undefined,
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
    console.error('Submit nomination error');
    return NextResponse.json(
      { error: 'Failed to submit nomination', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
