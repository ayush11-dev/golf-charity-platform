import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });

    if (!error) {
      const safeNext = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(`${request.nextUrl.origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(
    `${request.nextUrl.origin}/auth/auth-code-error`,
  );
}
