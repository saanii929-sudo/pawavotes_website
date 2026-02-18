import { NextRequest, NextResponse } from 'next/server';
import { stageService } from '@/services/stage.service';
import { createStageSchema, updateStageSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/stages?awardId=xxx
export async function GET(req: NextRequest) {
  try {
    const awardId = req.nextUrl.searchParams.get('awardId');
    
    if (!awardId) {
      return NextResponse.json(
        { success: false, message: 'awardId query parameter is required' },
        { status: 400 }
      );
    }
    
    const stages = await stageService.getStagesByAward(awardId);
    
    return NextResponse.json(
      successResponse('Stages retrieved successfully', stages)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

// POST /api/stages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received stage data:', body);
    
    const validatedData = createStageSchema.parse(body);
    console.log('Validated stage data:', validatedData);
    
    // Validate no overlap with existing stages
    await stageService.validateNoOverlap(
      validatedData.awardId,
      new Date(validatedData.startDate),
      validatedData.startTime,
      new Date(validatedData.endDate),
      validatedData.endTime
    );
    
    console.log('Overlap validation passed, creating stage...');
    const stage = await stageService.createStage(validatedData);
    console.log('Stage created successfully:', stage);
    
    return NextResponse.json(
      successResponse('Stage created successfully', stage),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating stage:', error);
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
