import { NextResponse } from "next/server";
import { requireNonAdmin } from "@/lib/admin-auth";
import { isSubscriptionActive } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ScorePayload = {
  score?: number;
  playedAt?: string;
};

function isValidPlayedAt(value: string) {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireNonAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const userId = auth.data.userId;

  const active = await isSubscriptionActive(userId);
  if (!active) {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const scoreId = Number(id);
  if (!Number.isFinite(scoreId)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const payload = (await request.json()) as ScorePayload;
  const score = payload.score;
  const playedAt = payload.playedAt;

  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 1 ||
    score > 45
  ) {
    return NextResponse.json(
      { error: "Score must be between 1 and 45" },
      { status: 400 },
    );
  }

  if (typeof playedAt !== "string" || !isValidPlayedAt(playedAt)) {
    return NextResponse.json({ error: "Invalid playedAt" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("scores")
    .update({ score, played_at: playedAt })
    .eq("id", scoreId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireNonAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const userId = auth.data.userId;

  const active = await isSubscriptionActive(userId);
  if (!active) {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const scoreId = Number(id);
  if (!Number.isFinite(scoreId)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("scores")
    .delete()
    .eq("id", scoreId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
