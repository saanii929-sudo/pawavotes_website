import { NextRequest, NextResponse } from 'next/server';
import { contestantService } from '@/services/contestant.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';
import { z } from 'zod';

const addContestantsSchema = z.object({
  nomineeIds: z.array(z.string()).min(1, 'At least one nominee ID is required'),
  addedBy: z.enum(['manual', 'qualification', 'initial']).default('manual'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params;
    const categoryId = req.nextUrl.searchParams.get('categoryId');
    
    const contestants = await contestantService.getStageContestants(
      stageId,
      categoryId || undefined
    );
    
    return NextResponse.json(
      successResponse('Contestants retrieved successfully', contestants)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params;
    const body = await req.json();
    const validatedData = addContestantsSchema.parse(body);
    
    const result = await contestantService.addContestantsToStage(
      stageId,
      validatedData.nomineeIds,
      validatedData.addedBy
    );
    
    return NextResponse.json(
      successResponse('Contestants added successfully', result),
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
