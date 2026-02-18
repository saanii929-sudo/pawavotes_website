import { NextRequest, NextResponse } from 'next/server';
import { leaderboardService } from '@/services/leaderboard.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/leaderboard/[awardId] - Get leaderboard for an award
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ awardId: string }> }
) {
  try {
    const { awardId } = await params;
    const stageId = req.nextUrl.searchParams.get('stageId');
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    let leaderboard;

    if (stageId) {
      // Get stage-specific leaderboard
      const Stage = (await import('@/models/Stage')).default;
      const stage = await Stage.findById(stageId);

      if (!stage) {
        return NextResponse.json(
          { success: false, message: 'Stage not found' },
          { status: 404 }
        );
      }

      // If stage is completed, get historical leaderboard
      if (stage.status === 'completed') {
        leaderboard = await leaderboardService.getHistoricalLeaderboard(
          stageId,
          categoryId || undefined
        );
      } else {
        // Get real-time leaderboard for active/upcoming stages
        leaderboard = await leaderboardService.getStageLeaderboard(
          stageId,
          categoryId || undefined
        );
      }
    } else {
      // Get award-wide leaderboard (all stages or no stages)
      leaderboard = await leaderboardService.getAwardLeaderboard(
        awardId,
        undefined,
        categoryId || undefined
      );
    }

    return NextResponse.json(
      successResponse('Leaderboard retrieved successfully', leaderboard)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
