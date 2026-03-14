import { NextRequest, NextResponse } from 'next/server';
import Stage from '@/models/Stage';
import { leaderboardService } from '@/services/leaderboard.service';
import { qualificationProcessor } from '@/services/qualification.service';
import { verifyToken } from '@/lib/auth';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!['organization', 'org-admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: stageId } = await params;

    const stage = await Stage.findById(stageId);

    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    stage.status = 'completed';
    await stage.save();

    await leaderboardService.createResultSnapshot(stageId);

    let qualificationResult = null;
    if (!stage.qualificationProcessed) {
      qualificationResult = await qualificationProcessor.processStageQualification(stageId);
    }

    return NextResponse.json(
      successResponse('Stage closed successfully', {
        stage,
        qualificationResult,
      })
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
