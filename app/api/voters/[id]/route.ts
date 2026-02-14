import { NextRequest, NextResponse } from 'next/server';
import { voterService } from '@/services/voter.service';
import { updateVoterSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voter = await voterService.getVoterById(params.id);
    return NextResponse.json(successResponse('Voter retrieved successfully', voter));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = updateVoterSchema.parse(body);
    
    const voter = await voterService.updateVoter(params.id, validatedData);
    
    return NextResponse.json(successResponse('Voter updated successfully', voter));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
