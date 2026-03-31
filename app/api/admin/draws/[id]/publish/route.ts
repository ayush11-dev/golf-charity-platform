import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const drawId = Number(id);

  if (!Number.isFinite(drawId)) {
    return NextResponse.json({ error: "Invalid draw id" }, { status: 400 });
  }

  const { data: fiveMatchWinner, error: winnersError } = await supabaseAdmin
    .from("draw_results")
    .select("id")
    .eq("draw_id", drawId)
    .eq("match_type", 5)
    .limit(1)
    .maybeSingle();

  if (winnersError) {
    return NextResponse.json({ error: winnersError.message }, { status: 500 });
  }

  const shouldCarryJackpot = !fiveMatchWinner;

  const { error: updateError } = await supabaseAdmin
    .from("draws")
    .update({ status: "published", jackpot_carried_over: shouldCarryJackpot })
    .eq("id", drawId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
