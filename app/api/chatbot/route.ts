import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatMessage from '@/models/ChatMessage';
import { detectIntent, generateHelpMessage } from '@/services/chatbot';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { message, sessionId, userId, userType } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      );
    }

    // Check for help command
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

    // Detect intent and generate response
    const { intent, confidence, response } = detectIntent(message);

    // Save chat message
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
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    );
  }
}

// Get chat history
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
      { error: 'Failed to fetch chat history', details: error.message },
      { status: 500 }
    );
  }
}
