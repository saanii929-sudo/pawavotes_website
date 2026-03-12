import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PendingVote from "@/models/PendingVote";
import PendingNomination from "@/models/PendingNomination";
import Vote from "@/models/Vote";
import Nominee from "@/models/Nominee";
import Category from "@/models/Category";
import Award from "@/models/Award";
import Payment from "@/models/Payment";
import NomineeCampaign from "@/models/NomineeCampaign";

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
    } else {
      console.error(`Unknown reference format: ${ClientReference}`);
      return NextResponse.json({ error: "Unknown reference format" }, { status: 400 });
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("Hubtel webhook error:", error);
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
    console.error("Failed to update campaign:", campaignError);
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
