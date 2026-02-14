import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Vote from "@/models/Vote";
import UssdSession from "@/models/UssdSession";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (decoded.role !== "superadmin" && decoded.role !== "organization") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get("awardId");

    let voteQuery: any = { paymentMethod: "ussd" };
    if (awardId) {
      voteQuery.awardId = awardId;
      const totalUssdVotes = await Vote.countDocuments(voteQuery);
      const completedUssdVotes = await Vote.countDocuments({
        ...voteQuery,
        paymentStatus: "completed",
      });
      const pendingUssdVotes = await Vote.countDocuments({
        ...voteQuery,
        paymentStatus: "pending",
      });
      const failedUssdVotes = await Vote.countDocuments({
        ...voteQuery,
        paymentStatus: "failed",
      });
      const revenueResult = await Vote.aggregate([
        {
          $match: {
            ...voteQuery,
            paymentStatus: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalVoteCount: { $sum: "$numberOfVotes" },
          },
        },
      ]);

      const revenue = revenueResult[0] || {
        totalRevenue: 0,
        totalVoteCount: 0,
      };
      const activeSessions = await UssdSession.countDocuments({
        isActive: true,
      });
      const recentVotes = await Vote.find(voteQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("nomineeId", "name")
        .populate("categoryId", "name")
        .lean();

      return NextResponse.json({
        success: true,
        stats: {
          total: totalUssdVotes,
          completed: completedUssdVotes,
          pending: pendingUssdVotes,
          failed: failedUssdVotes,
          revenue: revenue.totalRevenue,
          voteCount: revenue.totalVoteCount,
          activeSessions,
        },
        recentVotes,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error.message },
      { status: 500 },
    );
  }
}
