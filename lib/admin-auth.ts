import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminAuthResult = {
  userId: string;
  email: string | null;
  fullName: string | null;
};

export async function isAdminIdentity(userId: string, email: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminByEmail = Boolean(adminEmail && email && email === adminEmail);

  if (isAdminByEmail) {
    return { isAdmin: true as const, error: null };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      isAdmin: false as const,
      error: "Failed to verify admin access",
    };
  }

  return {
    isAdmin: profile?.subscription_status === "admin",
    error: null,
  };
}

export async function requireAdmin(): Promise<
  { ok: true; data: AdminAuthResult } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const fullName =
    typeof claims?.user_metadata?.full_name === "string"
      ? claims.user_metadata.full_name
      : null;

  if (claimsError || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const adminCheck = await isAdminIdentity(userId, email);
  if (adminCheck.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Failed to verify admin access" },
        { status: 500 },
      ),
    };
  }

  if (!adminCheck.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    data: { userId, email, fullName },
  };
}

export async function requireNonAdmin(): Promise<
  { ok: true; data: AdminAuthResult } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const fullName =
    typeof claims?.user_metadata?.full_name === "string"
      ? claims.user_metadata.full_name
      : null;

  if (claimsError || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const adminCheck = await isAdminIdentity(userId, email);
  if (adminCheck.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Failed to verify admin access" },
        { status: 500 },
      ),
    };
  }

  if (adminCheck.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin accounts can only access admin features" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    data: { userId, email, fullName },
  };
}
