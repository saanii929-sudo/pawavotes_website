import { NextRequest, NextResponse } from 'next/server';
import { bulkVotePackageService } from '@/services/bulk-vote-package.service';
import { createBulkVotePackageSchema, updateBulkVotePackageSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/bulk-vote-packages?awardId=xxx
export async function GET(req: NextRequest) {
  try {
    const awardId = req.nextUrl.searchParams.get('awardId');
    const onlyActive = req.nextUrl.searchParams.get('onlyActive') !== 'false';
    
    if (!awardId) {
      return NextResponse.json(
        { success: false, message: 'awardId query parameter is required' },
        { status: 400 }
      );
    }
    
    const packages = await bulkVotePackageService.getPackagesByAward(awardId, onlyActive);
    
    return NextResponse.json(
      successResponse('Bulk vote packages retrieved successfully', packages)
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

// POST /api/bulk-vote-packages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createBulkVotePackageSchema.parse(body);
    
    const pkg = await bulkVotePackageService.createPackage(validatedData);
    
    return NextResponse.json(
      successResponse('Bulk vote package created successfully', pkg),
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
