import { NextRequest, NextResponse } from 'next/server';
import { stageScheduler } from '@/services/stage-scheduler.service';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/cron/stage-scheduler - Cron job endpoint for stage transitions
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Stage scheduler cron job triggered');

    // Process stage transitions
    const result = await stageScheduler.processStageTransitions();

    console.log('✅ Stage scheduler completed:', {
      activated: result.activatedStages.length,
      closed: result.closedStages.length,
      qualified: result.qualificationResults.length,
    });

    return NextResponse.json(
      successResponse('Stage transitions processed successfully', result)
    );
  } catch (error: any) {
    console.error('❌ Stage scheduler error:', error);
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

// POST endpoint for manual triggering
export async function POST(req: NextRequest) {
  try {
    // Verify admin access for manual triggering
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

    console.log('🔄 Stage scheduler manually triggered');

    const result = await stageScheduler.processStageTransitions();

    console.log('✅ Stage scheduler completed:', {
      activated: result.activatedStages.length,
      closed: result.closedStages.length,
      qualified: result.qualificationResults.length,
    });

    return NextResponse.json(
      successResponse('Stage transitions processed successfully', result)
    );
  } catch (error: any) {
    console.error('❌ Stage scheduler error:', error);
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
