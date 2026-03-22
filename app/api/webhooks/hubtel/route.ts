import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PendingVote from "@/models/PendingVote";
import PendingNomination from "@/models/PendingNomination";
import TicketOrder from "@/models/TicketOrder";
import Vote from "@/models/Vote";
import Nominee from "@/models/Nominee";
import Category from "@/models/Category";
import Award from "@/models/Award";
import Payment from "@/models/Payment";
import NomineeCampaign from "@/models/NomineeCampaign";
import EventModel from "@/models/Event";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const { ResponseCode, Data } = body;

    if (ResponseCode !== "0000") {
      
      if (Data?.ClientReference) {
        const reference = Data.ClientReference;

        if (reference.startsWith("VOTE") || reference.startsWith("USSD-")) {
          await PendingVote.findOneAndUpdate(
            { reference },
            { status: "failed", paymentData: body }
          );
        } else if (reference.startsWith("NOM")) {
          await PendingNomination.findOneAndUpdate(
            { reference },
            { status: "failed", paymentData: body }
          );
        } else if (reference.startsWith("TKT")) {
          await TicketOrder.findOneAndUpdate(
            { reference },
            { status: "failed", paymentData: body }
          );
        }
      }
      
      return NextResponse.json({ message: "Payment not successful" }, { status: 200 });
    }

    const {
      ClientReference,
      Amount,
      CustomerPhoneNumber,
      PaymentDetails,
      Description,
    } = Data;

    if (ClientReference.startsWith("VOTE") || ClientReference.startsWith("USSD-")) {
      await processVotePayment(ClientReference, Amount, CustomerPhoneNumber, PaymentDetails, Data);
    } else if (ClientReference.startsWith("NOM")) {
      await processNominationPayment(ClientReference, Amount, CustomerPhoneNumber, PaymentDetails, Data);
    } else if (ClientReference.startsWith("TKT")) {
      await processTicketPayment(ClientReference, PaymentDetails, Data);
    } else {
      return NextResponse.json({ error: "Unknown reference format" }, { status: 400 });
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("Hubtel webhook processing error");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function processVotePayment(
  reference: string,
  amount: number,
  phone: string,
  paymentDetails: any,
  fullData: any
) {
  const pendingVote = await PendingVote.findOne({ reference });

  if (!pendingVote) {
    return;
  }

  if (pendingVote.status === "completed") {
    return;
  }
  const voteData = {
    awardId: pendingVote.awardId,
    categoryId: pendingVote.categoryId,
    nomineeId: pendingVote.nomineeId,
    voterEmail: pendingVote.email,
    voterPhone: pendingVote.phone,
    numberOfVotes: pendingVote.numberOfVotes,
    amount: pendingVote.amount,
    paymentReference: reference,
    paymentMethod: paymentDetails?.PaymentType || paymentDetails?.Channel || "mobile_money",
    paymentStatus: "completed" as const,
    ...(pendingVote.bulkPackageId && { bulkPackageId: pendingVote.bulkPackageId }),
  };

  const vote = await Vote.create(voteData);
  await Nominee.findByIdAndUpdate(pendingVote.nomineeId, {
    $inc: { voteCount: pendingVote.numberOfVotes },
  });
  await Category.findByIdAndUpdate(pendingVote.categoryId, {
    $inc: { voteCount: pendingVote.numberOfVotes },
  });
  await Award.findByIdAndUpdate(pendingVote.awardId, {
    $inc: { totalVotes: pendingVote.numberOfVotes },
  });
  try {
    const campaign = await NomineeCampaign.findOne({
      nomineeId: pendingVote.nomineeId,
      status: "active",
    });

    if (campaign) {
      campaign.currentAmount = (campaign.currentAmount || 0) + pendingVote.amount;
      const supporterExists = campaign.supporters.some(
        (s: any) => s.email === pendingVote.email
      );

      if (!supporterExists) {
        campaign.supporters.push({
          name: pendingVote.email,
          email: pendingVote.email,
          phone: pendingVote.phone,
          amount: pendingVote.amount,
          joinedAt: new Date(),
        });
      } else {
        const supporter = campaign.supporters.find(
          (s: any) => s.email === pendingVote.email
        );
        if (supporter) {
          supporter.amount = (supporter.amount || 0) + pendingVote.amount;
        }
      }
      campaign.analytics.donations = (campaign.analytics.donations || 0) + 1;

      await campaign.save();
    }
  } catch (campaignError) {
    // Campaign update failed silently
  }
  pendingVote.status = "completed";
  pendingVote.paymentData = fullData;
  await pendingVote.save();
}

async function processNominationPayment(
  reference: string,
  amount: number,
  phone: string,
  paymentDetails: any,
  fullData: any
) {
  const pendingNomination = await PendingNomination.findOne({ reference });

  if (!pendingNomination) {
    return;
  }
  if (pendingNomination.status === "completed") {
    return;
  }
  const nominee = await Nominee.create({
    name: pendingNomination.name,
    email: pendingNomination.email,
    phone: pendingNomination.phone || undefined,
    awardId: pendingNomination.awardId,
    categoryId: pendingNomination.categoryId,
    image: pendingNomination.image || undefined,
    bio: pendingNomination.bio || undefined,
    status: "draft",
    nominationStatus: "pending",
    nominationType: "self",
    voteCount: 0,
  });
  await Payment.create({
    transactionId: reference,
    nomineeId: nominee._id.toString(),
    awardId: pendingNomination.awardId,
    paymentMethod: paymentDetails?.PaymentType || "mobile_money",
    amount: pendingNomination.amount,
    currency: "GHS",
    voteCount: 0,
    status: "successful",
    reference,
  });
  await Category.findByIdAndUpdate(pendingNomination.categoryId, {
    $inc: { nomineeCount: 1 },
  });
  await Award.findByIdAndUpdate(pendingNomination.awardId, {
    $inc: { totalNominees: 1 },
  });
  pendingNomination.status = "completed";
  pendingNomination.paymentData = fullData;
  await pendingNomination.save();
}

async function processTicketPayment(
  reference: string,
  paymentDetails: any,
  fullData: any
) {
  const order = await TicketOrder.findOne({ reference });
  if (!order || order.status === "completed") return;

  // Generate unique ticket codes
  const ticketCodes: string[] = [];
  for (let i = 0; i < order.quantity; i++) {
    ticketCodes.push(
      `${reference.slice(0, 8)}-${String(i + 1).padStart(2, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
    );
  }

  // Mark order completed
  order.status = "completed";
  order.ticketCodes = ticketCodes;
  order.paymentData = fullData;
  await order.save();

  // Increment sold count on event ticket type
  await EventModel.findOneAndUpdate(
    { _id: order.eventId, "ticketTypes.id": order.ticketTypeId },
    { $inc: { "ticketTypes.$.sold": order.quantity, totalSold: order.quantity, totalRevenue: order.totalAmount } }
  );

  // Send ticket email + SMS (non-blocking, fire-and-forget)
  const event = await EventModel.findById(order.eventId).lean();
  if (event) {
    const { sendTicketConfirmationEmail } = await import("@/lib/email");
    sendTicketConfirmationEmail({
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      eventTitle: order.eventTitle,
      ticketTypeName: order.ticketTypeName,
      ticketTypeColor: order.ticketTypeColor,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalAmount: order.totalAmount,
      ticketCodes,
      eventDate: event.startDate.toISOString(),
      eventTime: event.startTime,
      venueName: event.venue?.isVirtual ? "Virtual Event" : (event.venue?.name || ""),
      venueAddress: event.venue?.isVirtual
        ? (event.venue?.virtualLink || "")
        : [event.venue?.address, event.venue?.city, event.venue?.country].filter(Boolean).join(", "),
      reference,
    }).catch(() => {});
  }

  // SMS confirmation (non-blocking)
  if (order.buyerPhone) {
    const { sendTicketSmsConfirmation } = await import("@/services/sms.service");
    sendTicketSmsConfirmation(
      order.buyerPhone,
      order.buyerName,
      order.eventTitle,
      order.ticketTypeName,
      order.quantity,
      reference,
    ).catch(() => {});
  }
}
