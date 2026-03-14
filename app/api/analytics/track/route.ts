import { NextRequest, NextResponse } from 'next/server';
import { withDB } from '@/middleware/db';
import PageView from '@/models/PageView';

function parseDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

async function trackPageView(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, referrer, sessionId } = body;

    if (!path || !sessionId) {
      return NextResponse.json({ error: 'path and sessionId required' }, { status: 400 });
    }

    const ua = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || '';

    await PageView.create({
      path,
      referrer: referrer || undefined,
      userAgent: ua,
      ip,
      device: parseDevice(ua),
      browser: parseBrowser(ua),
      sessionId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to track', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const POST = withDB(trackPageView);
