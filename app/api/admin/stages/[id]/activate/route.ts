import { NextRequest, NextResponse } from 'next/server';
import Stage from '@/models/Stage';
import { verifyToken } from '@/lib/auth';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// POST /api/admin/stages/[id]/activate - Manually activate a stage (for testing)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only allow organization admins and superadmins
    if (!['organization', 'org-admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: stageId } = await params;

    // Get stage
    const stage = await Stage.findById(stageId);

    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    // Check if there's already an active stage for this award
    const activeStage = await Stage.findOne({
      awardId: stage.awardId,
      status: 'active',
      _id: { $ne: stageId },
    });

    if (activeStage) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot activate stage. Award already has active stage: ${activeStage.name}`,
        },
        { status: 400 }
      );
    }

    // Activate stage
    stage.status = 'active';
    await stage.save();

    return NextResponse.json(
      successResponse('Stage activated successfully', stage)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
