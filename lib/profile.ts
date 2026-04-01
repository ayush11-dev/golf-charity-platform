import { supabaseAdmin } from "@/lib/supabase/admin";

export async function ensureProfileExists(
  userId: string,
  fullName?: string | null,
) {
  await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName ?? null,
    },
    {
      onConflict: "id",
      ignoreDuplicates: true,
    },
  );
}
