import { NextRequest, NextResponse } from 'next/server';
import { transferService } from '@/services/transfer.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transfer = await transferService.getTransferById(id);
    return NextResponse.json(successResponse('Transfer retrieved successfully', transfer));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
