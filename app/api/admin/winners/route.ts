import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const validStatuses = new Set(["pending", "approved", "paid", "rejected"]);

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { data, error } = await supabaseAdmin
    .from("draw_results")
    .select("*, profiles(full_name), draws(month, numbers)")
    .in("match_type", [3, 4, 5])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ winners: data ?? [] });
}

export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { resultId, paymentStatus } = (await request.json()) as {
    resultId?: number;
    paymentStatus?: string;
  };

  if (!Number.isFinite(resultId)) {
    return NextResponse.json({ error: "Invalid resultId" }, { status: 400 });
  }

  if (typeof paymentStatus !== "string" || !validStatuses.has(paymentStatus)) {
    return NextResponse.json(
      { error: "Invalid paymentStatus" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("draw_results")
    .update({ payment_status: paymentStatus })
    .eq("id", resultId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
