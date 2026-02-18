import Stage from '@/models/Stage';
import connectDB from '@/lib/mongodb';
import { qualificationProcessor } from './qualification.service';
import { leaderboardService } from './leaderboard.service';

export interface StageTransitionResult {
  activatedStages: string[];
  closedStages: string[];
  qualificationResults: Array<{
    stageId: string;
    qualifiedCount: number;
    error?: string;
  }>;
  timestamp: Date;
}

export class StageScheduler {
  async processStageTransitions(): Promise<StageTransitionResult> {
    await connectDB();

    const result: StageTransitionResult = {
      activatedStages: [],
      closedStages: [],
      qualificationResults: [],
      timestamp: new Date(),
    };

    try {
      const closedStages = await this.closeStages();
      result.closedStages = closedStages.map((s) => s._id.toString());
      for (const stage of closedStages) {
        try {
          await leaderboardService.createResultSnapshot(stage._id.toString());
          const qualResult = await qualificationProcessor.processStageQualification(
            stage._id.toString()
          );

          result.qualificationResults.push({
            stageId: stage._id.toString(),
            qualifiedCount: qualResult.qualifiedCount,
          });

          console.log(
            `✅ Stage ${stage.name} (${stage._id}) closed and processed: ${qualResult.qualifiedCount} qualified`
          );
        } catch (error) {
          console.error(
            `❌ Error processing qualification for stage ${stage._id}:`,
            error
          );
          result.qualificationResults.push({
            stageId: stage._id.toString(),
            qualifiedCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      const activatedStages = await this.activateStages();
      result.activatedStages = activatedStages.map((s) => s._id.toString());
      const awards = new Set([
        ...closedStages.map((s) => s.awardId.toString()),
        ...activatedStages.map((s) => s.awardId.toString()),
      ]);

      for (const awardId of awards) {
        await this.validateSingleActiveStage(awardId);
      }

      if (result.activatedStages.length > 0 || result.closedStages.length > 0) {
        console.log(
          `🔄 Stage transitions processed: ${result.activatedStages.length} activated, ${result.closedStages.length} closed`
        );
      }
    } catch (error) {
      console.error('❌ Error in processStageTransitions:', error);
      throw error;
    }

    return result;
  }
  async activateStages(): Promise<any[]> {
    await connectDB();

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    const stagesToActivate = await Stage.find({
      status: 'upcoming',
      $or: [
        { startDate: { $lt: new Date(currentDate) } },
        {
          startDate: { $lte: new Date(currentDate) },
          startTime: { $lte: currentTime },
        },
      ],
    });

    const activatedStages = [];

    for (const stage of stagesToActivate) {
      try {
        const activeStage = await Stage.findOne({
          awardId: stage.awardId,
          status: 'active',
          _id: { $ne: stage._id },
        });

        if (activeStage) {
          console.log(
            `⚠️ Cannot activate stage ${stage.name} - Award ${stage.awardId} already has active stage ${activeStage.name}`
          );
          continue;
        }
        stage.status = 'active';
        await stage.save();

        activatedStages.push(stage);

        console.log(
          `✅ Stage activated: ${stage.name} (${stage._id}) for award ${stage.awardId}`
        );
      } catch (error) {
        console.error(`❌ Error activating stage ${stage._id}:`, error);
      }
    }

    return activatedStages;
  }
  async closeStages(): Promise<any[]> {
    await connectDB();

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    const stagesToClose = await Stage.find({
      status: 'active',
      $or: [
        { endDate: { $lt: new Date(currentDate) } },
        {
          endDate: { $lte: new Date(currentDate) },
          endTime: { $lte: currentTime },
        },
      ],
    });

    const closedStages = [];

    for (const stage of stagesToClose) {
      try {
        stage.status = 'completed';
        await stage.save();

        closedStages.push(stage);

        console.log(
          `✅ Stage closed: ${stage.name} (${stage._id}) for award ${stage.awardId}`
        );
      } catch (error) {
        console.error(`❌ Error closing stage ${stage._id}:`, error);
      }
    }

    return closedStages;
  }
  async validateSingleActiveStage(awardId: string): Promise<boolean> {
    await connectDB();

    const activeStages = await Stage.find({
      awardId,
      status: 'active',
    });

    if (activeStages.length > 1) {
      console.error(
        `❌ Award ${awardId} has ${activeStages.length} active stages - should have at most 1`
      );
      activeStages.sort((a, b) => a.order - b.order);

      for (let i = 1; i < activeStages.length; i++) {
        const stage = activeStages[i];
        stage.status = 'upcoming';
        await stage.save();
        console.log(
          `⚠️ Reset stage ${stage.name} (${stage._id}) to upcoming to maintain single active stage constraint`
        );
      }

      return false;
    }

    return true;
  }

  async getNextTransitionTime(): Promise<Date | null> {
    await connectDB();

    const now = new Date();
    const upcomingStage = await Stage.findOne({
      status: 'upcoming',
      startDate: { $gte: now },
    }).sort({ startDate: 1, startTime: 1 });

    const activeStage = await Stage.findOne({
      status: 'active',
      endDate: { $gte: now },
    }).sort({ endDate: 1, endTime: 1 });

    const times: Date[] = [];

    if (upcomingStage) {
      const startDateTime = new Date(
        `${upcomingStage.startDate.toISOString().split('T')[0]}T${upcomingStage.startTime}:00`
      );
      times.push(startDateTime);
    }

    if (activeStage) {
      const endDateTime = new Date(
        `${activeStage.endDate.toISOString().split('T')[0]}T${activeStage.endTime}:00`
      );
      times.push(endDateTime);
    }

    if (times.length === 0) {
      return null;
    }

    return new Date(Math.min(...times.map((t) => t.getTime())));
  }
}

export const stageScheduler = new StageScheduler();
