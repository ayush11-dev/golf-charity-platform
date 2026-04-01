import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CharityPayload = {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  featured?: boolean;
};

function parseCharityId(id: string) {
  const charityId = Number(id);
  if (!Number.isFinite(charityId)) {
    return null;
  }
  return charityId;
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
  const charityId = parseCharityId(id);
  if (!charityId) {
    return NextResponse.json({ error: "Invalid charity id" }, { status: 400 });
  }

  const payload = (await request.json()) as CharityPayload;
  const updates: Record<string, unknown> = {};

  if (typeof payload.name === "string") {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (typeof payload.description === "string" || payload.description === null) {
    updates.description = payload.description;
  }

  if (typeof payload.image_url === "string" || payload.image_url === null) {
    updates.image_url = payload.image_url;
  }

  if (typeof payload.featured === "boolean") {
    updates.featured = payload.featured;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("charities")
    .update(updates)
    .eq("id", charityId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Charity not found" }, { status: 404 });
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
  const charityId = parseCharityId(id);
  if (!charityId) {
    return NextResponse.json({ error: "Invalid charity id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("charities")
    .delete()
    .eq("id", charityId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Charity not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
