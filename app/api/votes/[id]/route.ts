import { NextRequest, NextResponse } from 'next/server';
import { voteService } from '@/services/vote.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vote = await voteService.getVoteById(params.id);
    return NextResponse.json(successResponse('Vote retrieved successfully', vote));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
