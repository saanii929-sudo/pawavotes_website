import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Paystack webhook called - This integration has been migrated to Hubtel");
    console.log("Please update your webhook configuration to use /api/webhooks/hubtel");
    
    return NextResponse.json({ 
      message: "This webhook has been deprecated. Please use /api/webhooks/hubtel instead." 
    }, { status: 410 });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
