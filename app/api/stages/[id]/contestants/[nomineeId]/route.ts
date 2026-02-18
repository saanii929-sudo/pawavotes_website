import { NextRequest, NextResponse } from 'next/server';
import { contestantService } from '@/services/contestant.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// DELETE /api/stages/[id]/contestants/[nomineeId] - Remove contestant from stage
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nomineeId: string }> }
) {
  try {
    const { id: stageId, nomineeId } = await params;
    
    await contestantService.removeContestantFromStage(stageId, nomineeId);
    
    return NextResponse.json(
      successResponse('Contestant removed successfully')
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

// GET /api/stages/[id]/contestants/[nomineeId] - Check if contestant is in stage
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nomineeId: string }> }
) {
  try {
    const { id: stageId, nomineeId } = await params;
    
    const isInStage = await contestantService.isContestantInStage(stageId, nomineeId);
    
    return NextResponse.json(
      successResponse('Contestant status retrieved', { isInStage })
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
