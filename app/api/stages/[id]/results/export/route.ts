import { NextRequest, NextResponse } from 'next/server';
import { leaderboardService } from '@/services/leaderboard.service';
import Stage from '@/models/Stage';
import { handleError } from '@/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params;
    const categoryId = req.nextUrl.searchParams.get('categoryId');
    const stage = await Stage.findById(stageId);

    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }
    const results = await leaderboardService.getHistoricalLeaderboard(
      stageId,
      categoryId || undefined
    );
    const headers = ['Rank', 'Nominee Name', 'Vote Count', 'Last Vote At'];
    const rows = results.map((entry) => [
      entry.rank,
      entry.nomineeName,
      entry.voteCount,
      entry.lastVoteAt ? new Date(entry.lastVoteAt).toISOString() : 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stage-${stage.name.replace(/[^a-z0-9]/gi, '-')}-results.csv"`,
      },
    });
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
