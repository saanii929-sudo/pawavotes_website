import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { organizationRegistrationSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = organizationRegistrationSchema.parse(body);
    
    const result = await authService.registerOrganization(validatedData);
    
    return NextResponse.json(
      successResponse('Organization registered successfully', result),
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
