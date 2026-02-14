import { NextRequest, NextResponse } from 'next/server';
import { bulkVotePackageService } from '@/services/bulk-vote-package.service';
import { updateBulkVotePackageSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pkg = await bulkVotePackageService.getPackageById(id);
    return NextResponse.json(successResponse('Bulk vote package retrieved successfully', pkg));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateBulkVotePackageSchema.parse(body);
    
    const pkg = await bulkVotePackageService.updatePackage(id, validatedData);
    
    return NextResponse.json(successResponse('Bulk vote package updated successfully', pkg));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await bulkVotePackageService.deletePackage(id);
    return NextResponse.json(successResponse('Bulk vote package deleted successfully'));
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
