import { NextRequest, NextResponse } from 'next/server';
import { stageService } from '@/services/stage.service';
import { updateStageSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stage = await stageService.getStageById(id);
    return NextResponse.json(successResponse('Stage retrieved successfully', stage));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateStageSchema.parse(body);
    const existingStage = await stageService.getStageById(id);
    if (existingStage.status === 'active') {
      return NextResponse.json(
        { success: false, message: 'Cannot edit an active stage' },
        { status: 400 }
      );
    }
    
    if (existingStage.status === 'completed') {
      return NextResponse.json(
        { success: false, message: 'Cannot edit a completed stage' },
        { status: 400 }
      );
    }
    if (validatedData.startDate || validatedData.endDate) {
      await stageService.validateNoOverlap(
        existingStage.awardId.toString(),
        validatedData.startDate ? new Date(validatedData.startDate) : existingStage.startDate,
        validatedData.startTime || existingStage.startTime,
        validatedData.endDate ? new Date(validatedData.endDate) : existingStage.endDate,
        validatedData.endTime || existingStage.endTime,
        id
      );
    }
    
    const stage = await stageService.updateStage(id, validatedData);
    
    return NextResponse.json(successResponse('Stage updated successfully', stage));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await stageService.deleteStage(id);
    return NextResponse.json(successResponse('Stage deleted successfully'));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
