import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Vote from "@/models/Vote";
import Nominee from "@/models/Nominee";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    const hash = crypto
      .createHmac("sha512", paystackSecretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    // Handle charge.success event
    if (event.event === "charge.success") {
      const { reference, status, channel } = event.data;

      console.log(`Payment successful - Reference: ${reference}, Status: ${status}, Channel: ${channel}`);

      // Find the vote by payment reference
      const vote = await Vote.findOne({ paymentReference: reference });

      if (!vote) {
        console.error(`Vote not found for reference: ${reference}`);
        return NextResponse.json({ error: "Vote not found" }, { status: 404 });
      }

      // Update vote status to completed
      vote.paymentStatus = "completed";
      await vote.save();

      // Update nominee vote count
      await Nominee.findByIdAndUpdate(vote.nomineeId, {
        $inc: { voteCount: vote.numberOfVotes },
      });

      console.log(`Vote completed - Nominee: ${vote.nomineeId}, Votes: ${vote.numberOfVotes}`);

      return NextResponse.json({ message: "Webhook processed successfully" });
    }

    // Handle other events if needed
    return NextResponse.json({ message: "Event received" });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
