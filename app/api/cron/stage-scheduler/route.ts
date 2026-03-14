import { NextRequest, NextResponse } from 'next/server';
import { stageScheduler } from '@/services/stage-scheduler.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const result = await stageScheduler.processStageTransitions();

    return NextResponse.json(
      successResponse('Stage transitions processed successfully', result)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (token) {
      const { verifyToken } = await import('@/lib/auth');
      const decoded = verifyToken(token);
      
      if (!decoded || !['organization', 'org-admin', 'superadmin'].includes(decoded.role)) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    const result = await stageScheduler.processStageTransitions();

    return NextResponse.json(
      successResponse('Stage transitions processed successfully', result)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
