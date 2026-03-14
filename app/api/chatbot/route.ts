import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatMessage from '@/models/ChatMessage';
import { detectIntent, generateHelpMessage } from '@/services/chatbot';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 15 messages per minute per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`chatbot:${ip}`, 15, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many messages. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { message, sessionId, userId, userType } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      );
    }

    // Limit message length to prevent abuse
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1000 characters.' },
        { status: 400 }
      );
    }
    if (message.toLowerCase().trim() === 'help') {
      const helpResponse = generateHelpMessage();
      
      await ChatMessage.create({
        sessionId,
        userId,
        userType: userType || 'guest',
        message,
        response: helpResponse,
        intent: 'help',
        confidence: 1,
        resolved: true,
      });

      return NextResponse.json({
        success: true,
        response: helpResponse,
        intent: 'help',
        confidence: 1,
      });
    }
    const { intent, confidence, response } = detectIntent(message);
    const chatMessage = await ChatMessage.create({
      sessionId,
      userId,
      userType: userType || 'guest',
      message,
      response,
      intent,
      confidence,
      resolved: confidence > 0.5,
      escalated: confidence < 0.3,
    });

    return NextResponse.json({
      success: true,
      response,
      intent,
      confidence,
      messageId: chatMessage._id,
    });
  } catch (error: any) {
    console.error('Chatbot error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'SessionId is required' },
        { status: 400 }
      );
    }

    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
