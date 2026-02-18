import { NextRequest, NextResponse } from 'next/server';
import { leaderboardService } from '@/services/leaderboard.service';
import Stage from '@/models/Stage';
import { handleError } from '@/utils/error-handler';

// GET /api/stages/[id]/results/export - Export stage results as CSV
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params;
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    // Get stage
    const stage = await Stage.findById(stageId);

    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    // Get results
    const results = await leaderboardService.getHistoricalLeaderboard(
      stageId,
      categoryId || undefined
    );

    // Generate CSV
    const headers = ['Rank', 'Nominee Name', 'Vote Count', 'Qualified', 'Last Vote At'];
    const rows = results.map((entry) => [
      entry.rank,
      entry.nomineeName,
      entry.voteCount,
      entry.qualified ? 'Yes' : 'No',
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
