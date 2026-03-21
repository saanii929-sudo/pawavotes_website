import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventModel from '@/models/Event';

connectDB().catch(() => {});

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const query: any = {
      status: { $in: ['published', 'ongoing'] },
      'settings.isPublic': true,
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'venue.city': { $regex: search, $options: 'i' } },
        { organizationName: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      EventModel.find(query)
        .select('-organizationId -createdBy')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('[GET /api/public/events]', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
