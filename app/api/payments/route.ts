import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/payment.service';
import { createPaymentSchema } from '@/lib/schemas';
import { successResponse, paginatedResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';
import { verifyToken } from '@/lib/auth';

// GET /api/payments?awardId=xxx or ?nomineeId=xxx
export async function GET(req: NextRequest) {
  try {
    // Require authentication to access payment data
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const awardId = req.nextUrl.searchParams.get('awardId');
    const nomineeId = req.nextUrl.searchParams.get('nomineeId');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    
    let result;
    
    if (awardId) {
      result = await paymentService.getPaymentsByAward(awardId, page, limit);
    } else if (nomineeId) {
      result = await paymentService.getPaymentsByNominee(nomineeId, page, limit);
    } else {
      return NextResponse.json(
        { success: false, message: 'awardId or nomineeId query parameter is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      paginatedResponse('Payments retrieved successfully', result.payments, result.pagination)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

// POST /api/payments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createPaymentSchema.parse(body);
    
    const payment = await paymentService.createPayment(validatedData);
    
    return NextResponse.json(
      successResponse('Payment created successfully', payment),
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
