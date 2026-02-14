import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/payment.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await paymentService.getPaymentById(id);
    return NextResponse.json(successResponse('Payment retrieved successfully', payment));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
