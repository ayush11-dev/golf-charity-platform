import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Payload = {
  plan?: "monthly" | "yearly";
  status?: string;
  current_period_end?: string | null;
};

const validPlans = new Set(["monthly", "yearly"]);
const validStatuses = new Set([
  "active",
  "inactive",
  "cancelled",
  "trialing",
  "past_due",
  "unpaid",
]);

function parseIsoDate(value: string | null | undefined) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id: userId } = await params;

  const payload = (await request.json()) as Payload;
  const plan = payload.plan;
  const status = payload.status;
  const currentPeriodEnd = parseIsoDate(payload.current_period_end);

  if (!status || !validStatuses.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!plan || !validPlans.has(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (
    payload.current_period_end !== undefined &&
    currentPeriodEnd === undefined
  ) {
    return NextResponse.json(
      { error: "Invalid current_period_end" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan,
        status,
        current_period_end: currentPeriodEnd ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      plan,
      status,
      current_period_end: currentPeriodEnd ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const profileStatus = status === "active" ? "active" : "inactive";
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ subscription_status: profileStatus })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
