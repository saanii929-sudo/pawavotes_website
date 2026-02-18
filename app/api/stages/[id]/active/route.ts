import { NextRequest, NextResponse } from 'next/server';
import { stageService } from '@/services/stage.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/stages/[awardId]/active - Get active stage for an award
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: awardId } = await params;
    
    const activeStage = await stageService.getActiveStage(awardId);
    
    if (!activeStage) {
      return NextResponse.json(
        { success: false, message: 'No active stage found for this award' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      successResponse('Active stage retrieved successfully', activeStage)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
