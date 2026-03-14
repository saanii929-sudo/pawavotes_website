import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import Vote from '@/models/Vote';
import { verifyToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: awardId } = await params;
    const award = await Award.findById(awardId);
    if (!award) {
      return NextResponse.json({ error: 'Award not found' }, { status: 404 });
    }
    if (decoded.role !== 'superadmin' && award.organizationId.toString() !== decoded.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const now = new Date();
    if (award.votingEndDate && now < new Date(award.votingEndDate)) {
      return NextResponse.json(
        { error: 'Voting period has not ended yet' },
        { status: 400 }
      );
    }
    const categories = await Category.find({ awardId, status: 'published' });

    const winners = [];

    for (const category of categories) {
      const voteResults = await Vote.aggregate([
        {
          $match: {
            awardId: award._id,
            categoryId: category._id,
            paymentStatus: 'completed',
          },
        },
        {
          $group: {
            _id: '$nomineeId',
            totalVotes: { $sum: '$numberOfVotes' },
            totalAmount: { $sum: '$amount' },
            voteCount: { $sum: 1 },
          },
        },
        { $sort: { totalVotes: -1 } },
        { $limit: 3 }, // Top 3
      ]);

      if (voteResults.length > 0) {
        const nomineeIds = voteResults.map(v => v._id);
        const nominees = await Nominee.find({ _id: { $in: nomineeIds } });

        const categoryWinners = voteResults.map((result, index) => {
          const nominee = nominees.find(n => n._id.toString() === result._id.toString());
          return {
            position: index + 1,
            categoryId: category._id,
            categoryName: category.name,
            nomineeId: result._id,
            nomineeName: nominee?.name || 'Unknown',
            nomineeImage: nominee?.image,
            totalVotes: result.totalVotes,
            totalAmount: result.totalAmount,
            voteCount: result.voteCount,
          };
        });

        winners.push(...categoryWinners);
        if (categoryWinners[0]) {
          await Nominee.findByIdAndUpdate(categoryWinners[0].nomineeId, {
            status: 'winner',
          });
        }
      }
    }

    await Award.findByIdAndUpdate(awardId, {
      status: 'completed',
      winnersAnnounced: true,
      winnersAnnouncedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Winners announced successfully',
      winners,
      totalCategories: categories.length,
      totalWinners: winners.length,
    });
  } catch (error: any) {
    console.error('Announce winners error:', error);
    return NextResponse.json(
      { error: 'Failed to announce winners', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: awardId } = await params;
    const award = await Award.findById(awardId);
    if (!award) {
      return NextResponse.json({ error: 'Award not found' }, { status: 404 });
    }

    if (!award.winnersAnnounced) {
      return NextResponse.json({
        success: true,
        announced: false,
        message: 'Winners have not been announced yet',
      });
    }
    const categories = await Category.find({ awardId, status: 'published' });

    const winners = [];

    for (const category of categories) {
      const voteResults = await Vote.aggregate([
        {
          $match: {
            awardId: award._id,
            categoryId: category._id,
            paymentStatus: 'completed',
          },
        },
        {
          $group: {
            _id: '$nomineeId',
            totalVotes: { $sum: '$numberOfVotes' },
            totalAmount: { $sum: '$amount' },
          },
        },
        { $sort: { totalVotes: -1 } },
        { $limit: 3 },
      ]);

      if (voteResults.length > 0) {
        const nomineeIds = voteResults.map(v => v._id);
        const nominees = await Nominee.find({ _id: { $in: nomineeIds } });

        const categoryWinners = voteResults.map((result, index) => {
          const nominee = nominees.find(n => n._id.toString() === result._id.toString());
          return {
            position: index + 1,
            categoryName: category.name,
            nomineeName: nominee?.name || 'Unknown',
            nomineeImage: nominee?.image,
            totalVotes: result.totalVotes,
          };
        });

        winners.push(...categoryWinners);
      }
    }

    return NextResponse.json({
      success: true,
      announced: true,
      announcedAt: award.winnersAnnouncedAt,
      winners,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch winners', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
