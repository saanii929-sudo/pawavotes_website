import { NextRequest, NextResponse } from 'next/server';
import { bulkVotePackageService } from '@/services/bulk-vote-package.service';
import { createBulkVotePackageSchema, updateBulkVotePackageSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Require authentication to list packages
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

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

export async function POST(req: NextRequest) {
  try {
    // Require authentication to create packages
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

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
