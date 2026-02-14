import { NextRequest, NextResponse } from 'next/server';
import { awardService } from '@/services/award.service';
import { categoryService } from '@/services/category.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// POST /api/awards/:id/publish
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const award = await awardService.publishAward(params.id);
    return NextResponse.json(successResponse('Award published successfully', award));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
