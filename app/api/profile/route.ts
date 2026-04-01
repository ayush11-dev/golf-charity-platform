import { NextResponse } from "next/server";
import { requireNonAdmin } from "@/lib/admin-auth";
import { ensureProfileExists } from "@/lib/profile";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfilePayload = {
  charityId?: number | null;
  charityPct?: number;
};

export async function PATCH(request: Request) {
  const auth = await requireNonAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const userId = auth.data.userId;

  const payload = (await request.json()) as ProfilePayload;
  const charityId = payload.charityId;
  const charityPct = payload.charityPct;

  if (typeof charityPct !== "number" || charityPct < 10 || charityPct > 100) {
    return NextResponse.json(
      { error: "Charity percentage must be between 10 and 100" },
      { status: 400 },
    );
  }

  if (charityId !== null && typeof charityId !== "number") {
    return NextResponse.json({ error: "Invalid charity id" }, { status: 400 });
  }

  if (typeof charityId === "number") {
    const { data: charity } = await supabaseAdmin
      .from("charities")
      .select("id")
      .eq("id", charityId)
      .maybeSingle();

    if (!charity) {
      return NextResponse.json({ error: "Charity not found" }, { status: 404 });
    }
  }

  await ensureProfileExists(userId, auth.data.fullName);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      charity_id: charityId,
      charity_pct: charityPct,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
