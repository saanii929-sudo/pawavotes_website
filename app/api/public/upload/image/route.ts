import { NextRequest, NextResponse } from 'next/server';
import {
  uploadToR2,
  generateFileKey,
  validateFileType,
  validateFileSize,
} from '@/lib/r2-upload';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 uploads per IP per minute
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`public-upload:${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many uploads. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!validateFileType(file.type, ALLOWED_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPG, PNG, GIF, WebP) are allowed.' },
        { status: 400 }
      );
    }

    if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = generateFileKey(file.name, 'awards/nominations');
    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({ success: true, url, key });
  } catch (error: any) {
    console.error('Public image upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
