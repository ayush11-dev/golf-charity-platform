import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sendDrawResultEmail, sendWinnerAlertEmail } from "@/lib/notifications";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DrawRow = {
  month: string;
  numbers: number[];
};

type WinnerRow = {
  user_id: string;
  match_type: number;
  individual_share: number;
};

async function getUserEmail(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error) {
    console.error("Failed to load user email:", error);
    return null;
  }

  return data.user?.email ?? null;
}

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

  const { data: drawData } = await supabaseAdmin
    .from("draws")
    .select("month, numbers")
    .eq("id", drawId)
    .maybeSingle();

  const { data: winnerRows } = await supabaseAdmin
    .from("draw_results")
    .select("user_id, match_type, individual_share")
    .eq("draw_id", drawId);

  const { data: activeSubscriptions } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active");

  const draw = (drawData as DrawRow | null) ?? null;
  const winners = (winnerRows as WinnerRow[] | null) ?? [];
  const participantUserIds = [
    ...new Set((activeSubscriptions ?? []).map((row) => row.user_id)),
  ];

  if (draw) {
    const winnerByUserId = new Map<string, WinnerRow>();
    for (const winner of winners) {
      winnerByUserId.set(winner.user_id, winner);
    }

    for (const userId of participantUserIds) {
      const email = await getUserEmail(userId);
      if (!email) {
        continue;
      }

      const winner = winnerByUserId.get(userId);
      const payload = {
        to: email,
        month: draw.month,
        numbers: draw.numbers,
        winner: winner
          ? {
              matchType: winner.match_type,
              prizeAmount: Number(winner.individual_share ?? 0),
            }
          : undefined,
      };

      await sendDrawResultEmail(payload);

      if (winner) {
        await sendWinnerAlertEmail(payload);
      }
    }
  }

  return NextResponse.json({ success: true });
}
