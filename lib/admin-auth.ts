import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminAuthResult = {
  userId: string;
  email: string | null;
};

export async function requireAdmin(): Promise<
  { ok: true; data: AdminAuthResult } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  const email = typeof claims?.email === "string" ? claims.email : null;

  if (claimsError || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Failed to verify admin access" },
        { status: 500 },
      ),
    };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminByStatus = profile?.subscription_status === "admin";
  const isAdminByEmail = Boolean(adminEmail && email && email === adminEmail);

  if (!isAdminByStatus && !isAdminByEmail) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    data: { userId, email },
  };
}
