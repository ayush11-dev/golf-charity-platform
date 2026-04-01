import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { data, error } = await supabaseAdmin
    .from("draw_results")
    .select(
      "id, match_type, individual_share, payment_status, profiles(full_name), draws(month, numbers)",
    )
    .in("match_type", [3, 4, 5])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ winners: data ?? [] });
}
