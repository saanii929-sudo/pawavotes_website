import { NextRequest, NextResponse } from 'next/server';
import { qualificationProcessor } from '@/services/qualification.service';
import { verifyToken } from '@/lib/auth';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!['organization', 'org-admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: stageId } = await params;
    const result = await qualificationProcessor.processStageQualification(stageId);

    return NextResponse.json(
      successResponse('Qualification processed successfully', result)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
