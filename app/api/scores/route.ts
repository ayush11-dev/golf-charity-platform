import { NextResponse } from "next/server";
import { requireNonAdmin } from "@/lib/admin-auth";
import { ensureProfileExists } from "@/lib/profile";
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

export async function POST(request: Request) {
  const auth = await requireNonAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const userId = auth.data.userId;

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

  await ensureProfileExists(userId, auth.data.fullName);

  const active = await isSubscriptionActive(userId);
  if (!active) {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 403 },
    );
  }

  const { error } = await supabaseAdmin.from("scores").insert({
    user_id: userId,
    score,
    played_at: playedAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
