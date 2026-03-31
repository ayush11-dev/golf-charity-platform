import { redirect } from "next/navigation";
import AdminPanel from "@/app/components/AdminPanel";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AnalyticsData = {
  activeSubscribers: number;
  totalPrizePoolThisMonth: number;
  totalPaidOut: number;
  totalCharityContributions: number;
};

function monthStartIso(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const email = typeof claims?.email === "string" ? claims.email : null;

  if (!claims?.sub) {
    redirect("/login");
  }

  if (!process.env.ADMIN_EMAIL || email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const monthIso = monthStartIso();

  const [activeSubsResult, drawsResult, paidResults] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("user_id", { count: "exact", head: false })
      .eq("status", "active"),
    supabaseAdmin.from("draws").select("jackpot_amount").eq("month", monthIso),
    supabaseAdmin
      .from("draw_results")
      .select("individual_share")
      .eq("payment_status", "paid"),
  ]);

  const activeSubscribers = activeSubsResult.count ?? 0;
  const totalPrizePoolThisMonth = Number(
    (
      (drawsResult.data ?? []).reduce(
        (sum, row) => sum + Number(row.jackpot_amount ?? 0),
        0,
      ) / 0.4
    ).toFixed(2),
  );
  const totalPaidOut = Number(
    (paidResults.data ?? [])
      .reduce((sum, row) => sum + Number(row.individual_share ?? 0), 0)
      .toFixed(2),
  );

  const activeUserIds = [
    ...new Set((activeSubsResult.data ?? []).map((row) => row.user_id)),
  ];
  let totalCharityContributions = 0;

  if (activeUserIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("id, charity_pct")
      .in("id", activeUserIds);

    totalCharityContributions = Number(
      (profileRows ?? [])
        .reduce(
          (sum, profile) =>
            sum + (Number(profile.charity_pct ?? 10) / 100) * 999,
          0,
        )
        .toFixed(2),
    );
  }

  const analytics: AnalyticsData = {
    activeSubscribers,
    totalPrizePoolThisMonth,
    totalPaidOut,
    totalCharityContributions,
  };

  return <AdminPanel analytics={analytics} />;
}
