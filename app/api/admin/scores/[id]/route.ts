import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Payload = {
  score?: number;
  played_at?: string;
};

function isValidDate(value: string) {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const scoreId = Number(id);
  if (!Number.isFinite(scoreId)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const payload = (await request.json()) as Payload;
  const score = payload.score;
  const playedAt = payload.played_at;

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

  if (typeof playedAt !== "string" || !isValidDate(playedAt)) {
    return NextResponse.json({ error: "Invalid played_at" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("scores")
    .update({ score, played_at: playedAt })
    .eq("id", scoreId)
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
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
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
