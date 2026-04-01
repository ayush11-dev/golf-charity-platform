import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CharityPayload = {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  featured?: boolean;
};

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { data, error } = await supabaseAdmin
    .from("charities")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ charities: data ?? [] });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const payload = (await request.json()) as CharityPayload;
  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("charities").insert({
    name,
    description: payload.description ?? null,
    image_url: payload.image_url ?? null,
    featured: Boolean(payload.featured),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
