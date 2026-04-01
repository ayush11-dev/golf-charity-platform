import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ForceMatchPayload = {
  drawId?: number;
};

type DrawRow = {
  id: number;
  numbers: number[];
};

function isValidDrawNumbers(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    value.every(
      (num) =>
        typeof num === "number" &&
        Number.isFinite(num) &&
        num >= 1 &&
        num <= 45,
    )
  );
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const payload = (await request.json()) as ForceMatchPayload;
  const drawId = payload.drawId;

  if (typeof drawId !== "number" || !Number.isFinite(drawId)) {
    return NextResponse.json({ error: "Invalid drawId" }, { status: 400 });
  }

  const { data: drawData, error: drawError } = await supabaseAdmin
    .from("draws")
    .select("id, numbers")
    .eq("id", drawId)
    .maybeSingle();

  if (drawError) {
    return NextResponse.json({ error: drawError.message }, { status: 500 });
  }

  if (!drawData) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  const draw = drawData as DrawRow;
  if (!isValidDrawNumbers(draw.numbers)) {
    return NextResponse.json(
      { error: "Draw numbers are missing or invalid" },
      { status: 400 },
    );
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

  const playedAt = new Date().toISOString().slice(0, 10);
  let usersUpdated = 0;

  for (const userId of activeUserIds) {
    const { data: existingScores, error: existingScoresError } =
      await supabaseAdmin
        .from("scores")
        .select("id, score")
        .eq("user_id", userId);

    if (existingScoresError) {
      return NextResponse.json(
        { error: existingScoresError.message },
        { status: 500 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("scores")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const forcedScores = draw.numbers.map((score) => ({
      user_id: userId,
      score,
      played_at: playedAt,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("scores")
      .insert(forcedScores);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("Force-match updated user:", userId, {
      previousScores: existingScores?.length ?? 0,
      newScores: forcedScores.length,
    });

    usersUpdated += 1;
  }

  return NextResponse.json({ success: true, usersUpdated });
}
