import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log("Old vote initiate endpoint called - This has been migrated");
    console.log("Please use /api/public/votes/initialize instead");
    
    return NextResponse.json(
      { 
        error: 'This endpoint has been deprecated. Please use /api/public/votes/initialize instead.',
        newEndpoint: '/api/public/votes/initialize'
      },
      { status: 410 }
    );
  } catch (error: any) {
    console.error('Vote initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate vote', details: error.message },
      { status: 500 }
    );
  }
}
