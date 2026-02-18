import { NextRequest, NextResponse } from 'next/server';
import { leaderboardService } from '@/services/leaderboard.service';
import StageResult from '@/models/StageResult';
import Stage from '@/models/Stage';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/stages/[id]/results - Get stage results
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params;
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    // Get stage to verify it exists and is completed
    const stage = await Stage.findById(stageId);

    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    // Get results from snapshot
    const results = await leaderboardService.getHistoricalLeaderboard(
      stageId,
      categoryId || undefined
    );

    return NextResponse.json(
      successResponse('Stage results retrieved successfully', {
        stage: {
          id: stage._id,
          name: stage.name,
          order: stage.order,
          status: stage.status,
          startDate: stage.startDate,
          endDate: stage.endDate,
          qualificationRule: stage.qualificationRule,
          qualificationProcessed: stage.qualificationProcessed,
        },
        results,
      })
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
