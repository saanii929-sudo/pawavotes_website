import { NextRequest, NextResponse } from 'next/server';
import Stage from '@/models/Stage';
import { leaderboardService } from '@/services/leaderboard.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ awardId: string }> }
) {
  try {
    const { awardId } = await params;
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    // Get all completed stages for this award
    const completedStages = await Stage.find({
      awardId,
      status: 'completed',
    }).sort({ order: 1 });

    const history = await Promise.all(
      completedStages.map(async (stage) => {
        const leaderboard = await leaderboardService.getHistoricalLeaderboard(
          stage._id.toString(),
          categoryId || undefined
        );

        return {
          stageId: stage._id,
          stageName: stage.name,
          stageOrder: stage.order,
          startDate: stage.startDate,
          endDate: stage.endDate,
          qualificationRule: stage.qualificationRule,
          qualificationProcessed: stage.qualificationProcessed,
          leaderboard,
        };
      })
    );

    return NextResponse.json(
      successResponse('Historical leaderboards retrieved successfully', history)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
