import { redirect } from "next/navigation";
import { isAdminIdentity } from "@/lib/admin-auth";
import { ensureProfileExists } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    redirect("/login");
  }

  const email = typeof claims.email === "string" ? claims.email : null;
  const adminCheck = await isAdminIdentity(claims.sub, email);

  if (adminCheck.isAdmin) {
    redirect("/admin");
  }

  const fullName =
    typeof claims.user_metadata?.full_name === "string"
      ? claims.user_metadata.full_name
      : null;
  await ensureProfileExists(claims.sub, fullName);

  return <div className="min-h-screen">{children}</div>;
}
