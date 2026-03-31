import { NextResponse } from "next/server";
import {
  calculatePrizePool,
  checkMatch,
  generateAlgorithmicDraw,
  generateRandomDraw,
  splitPrize,
} from "@/lib/draw-engine";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DrawMode = "random" | "algorithmic";

type ScoreRow = {
  user_id: string;
  score: number;
};

function isDrawMode(value: unknown): value is DrawMode {
  return value === "random" || value === "algorithmic";
}

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { data, error } = await supabaseAdmin
    .from("draws")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draws: data ?? [] });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const payload = (await request.json()) as {
    month?: string;
    drawMode?: DrawMode;
  };

  const month = payload.month;
  const drawMode = payload.drawMode;

  if (typeof month !== "string" || Number.isNaN(Date.parse(month))) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  if (!isDrawMode(drawMode)) {
    return NextResponse.json({ error: "Invalid drawMode" }, { status: 400 });
  }

  const { data: activeSubscriptions, error: activeSubsError } =
    await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active");

  if (activeSubsError) {
    return NextResponse.json(
      { error: activeSubsError.message },
      { status: 500 },
    );
  }

  const activeUserIds = [
    ...new Set((activeSubscriptions ?? []).map((row) => row.user_id)),
  ];
  const activeSubscriberCount = activeUserIds.length;

  const { data: scoreRows, error: scoresError } = await supabaseAdmin
    .from("scores")
    .select("user_id, score")
    .in(
      "user_id",
      activeUserIds.length > 0
        ? activeUserIds
        : ["00000000-0000-0000-0000-000000000000"],
    );

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }

  const allScores = (scoreRows as ScoreRow[] | null) ?? [];
  const flatScoreValues = allScores.map((row) => row.score);

  const drawnNumbers =
    drawMode === "algorithmic"
      ? generateAlgorithmicDraw(flatScoreValues)
      : generateRandomDraw();

  const prizePool = calculatePrizePool(activeSubscriberCount);

  const { data: previousRolloverDraw } = await supabaseAdmin
    .from("draws")
    .select("jackpot_amount")
    .eq("jackpot_carried_over", true)
    .eq("status", "published")
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rolloverAmount = Number(previousRolloverDraw?.jackpot_amount ?? 0);
  const effectiveJackpotPool = Number(
    (prizePool.jackpot + rolloverAmount).toFixed(2),
  );

  const { data: newDraw, error: drawInsertError } = await supabaseAdmin
    .from("draws")
    .insert({
      month,
      numbers: drawnNumbers,
      status: "simulated",
      draw_mode: drawMode,
      jackpot_amount: effectiveJackpotPool,
    })
    .select("id")
    .single();

  if (drawInsertError || !newDraw) {
    return NextResponse.json(
      { error: drawInsertError?.message ?? "Failed to create draw" },
      { status: 500 },
    );
  }

  const userScoresMap = new Map<string, number[]>();
  for (const row of allScores) {
    const existing = userScoresMap.get(row.user_id) ?? [];
    existing.push(row.score);
    userScoresMap.set(row.user_id, existing);
  }

  const fiveMatchWinners = [] as string[];
  const fourMatchWinners = [] as string[];
  const threeMatchWinners = [] as string[];

  for (const userId of activeUserIds) {
    const userScores = userScoresMap.get(userId) ?? [];
    const matchType = checkMatch(userScores, drawnNumbers);

    if (matchType === 5) {
      fiveMatchWinners.push(userId);
    } else if (matchType === 4) {
      fourMatchWinners.push(userId);
    } else if (matchType === 3) {
      threeMatchWinners.push(userId);
    }
  }

  const fiveMatchShare = splitPrize(
    effectiveJackpotPool,
    fiveMatchWinners.length,
  );
  const fourMatchShare = splitPrize(
    prizePool.fourMatch,
    fourMatchWinners.length,
  );
  const threeMatchShare = splitPrize(
    prizePool.threeMatch,
    threeMatchWinners.length,
  );

  const drawResultsPayload = [
    ...fiveMatchWinners.map((userId) => ({
      draw_id: newDraw.id,
      user_id: userId,
      match_type: 5,
      tier_pool_amount: effectiveJackpotPool,
      winners_count: fiveMatchWinners.length,
      individual_share: fiveMatchShare,
    })),
    ...fourMatchWinners.map((userId) => ({
      draw_id: newDraw.id,
      user_id: userId,
      match_type: 4,
      tier_pool_amount: prizePool.fourMatch,
      winners_count: fourMatchWinners.length,
      individual_share: fourMatchShare,
    })),
    ...threeMatchWinners.map((userId) => ({
      draw_id: newDraw.id,
      user_id: userId,
      match_type: 3,
      tier_pool_amount: prizePool.threeMatch,
      winners_count: threeMatchWinners.length,
      individual_share: threeMatchShare,
    })),
  ];

  if (drawResultsPayload.length > 0) {
    const { error: resultsError } = await supabaseAdmin
      .from("draw_results")
      .insert(drawResultsPayload);

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    drawId: newDraw.id,
    numbers: drawnNumbers,
    winners: {
      fiveMatch: fiveMatchWinners.length,
      fourMatch: fourMatchWinners.length,
      threeMatch: threeMatchWinners.length,
    },
    prizePool: {
      ...prizePool,
      jackpot: effectiveJackpotPool,
    },
  });
}
