import { NextResponse } from "next/server";
import { requireNonAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProofPayload = {
  proofUrl?: string;
};

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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

  const { id } = await params;
  const resultId = Number(id);
  if (!Number.isFinite(resultId)) {
    return NextResponse.json(
      { error: "Invalid draw result id" },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as ProofPayload;
  const proofUrl = payload.proofUrl;

  if (typeof proofUrl !== "string" || !isValidUrl(proofUrl)) {
    return NextResponse.json(
      { error: "Proof URL must be a valid http or https URL" },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("draw_results")
    .update({ proof_url: proofUrl, payment_status: "pending" })
    .eq("id", resultId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Draw result not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
