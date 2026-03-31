import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScoreEntry from "@/app/components/ScoreEntry";

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type Profile = {
  id: string;
  charity_id: number | null;
  charity_pct: number;
  subscription_status: string;
};

type Subscription = {
  plan: "monthly" | "yearly";
  status: string;
  current_period_end: string | null;
};

type Score = {
  id: number;
  score: number;
  played_at: string;
  created_at: string;
};

type Charity = {
  id: number;
  name: string;
  description: string | null;
};

type DrawResult = {
  id: number;
  match_type: number;
  individual_share: number;
  payment_status: "pending" | "approved" | "paid" | "rejected";
  created_at: string;
  draws: {
    month: string;
    numbers: number[];
    status: string;
  } | null;
};

const fullDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

const currencyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return fullDateFormat.format(parsed);
}

function formatMonth(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return monthFormat.format(parsed);
}

function matchTypeLabel(matchType: number) {
  return `${matchType} Number Match`;
}

function paymentStatusClasses(status: DrawResult["payment_status"]) {
  if (status === "paid") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (status === "approved") {
    return "border-blue-500/40 bg-blue-500/15 text-blue-300";
  }
  if (status === "rejected") {
    return "border-red-500/40 bg-red-500/15 text-red-300";
  }
  return "border-yellow-500/40 bg-yellow-500/15 text-yellow-200";
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const profilePromise = supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const subscriptionPromise = supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const scoresPromise = supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const drawResultsPromise = supabase
    .from("draw_results")
    .select("*, draws(month, numbers, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const charityPromise = profilePromise.then(
    async ({ data: profileData, error }) => {
      if (error || !profileData?.charity_id) {
        return { data: null, error: null };
      }

      return supabase
        .from("charities")
        .select("*")
        .eq("id", profileData.charity_id)
        .single();
    },
  );

  const [
    profileResult,
    subscriptionResult,
    scoresResult,
    charityResult,
    drawResultsResult,
  ] = await Promise.all([
    profilePromise,
    subscriptionPromise,
    scoresPromise,
    charityPromise,
    drawResultsPromise,
  ]);

  const profile = (profileResult.data as Profile | null) ?? null;
  const subscription = (subscriptionResult.data as Subscription | null) ?? null;
  const scores = (scoresResult.data as Score[] | null) ?? [];
  const charity = (charityResult.data as Charity | null) ?? null;
  const drawResults = (drawResultsResult.data as DrawResult[] | null) ?? [];

  const scoreCards = [...scores]
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
    )
    .slice(0, 5);

  const totalWinnings = drawResults
    .filter((result) => result.payment_status === "paid")
    .reduce((sum, result) => sum + Number(result.individual_share ?? 0), 0);

  const isSubscriptionSuccess = params.subscription === "success";
  const isActiveSubscription = subscription?.status === "active";
  const planLabel = subscription?.plan
    ? `${subscription.plan.charAt(0).toUpperCase()}${subscription.plan.slice(1)}`
    : "No active plan";

  return (
    <div className="space-y-8">
      {isSubscriptionSuccess ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Subscription activated successfully!
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Subscription
          </p>
          <p
            className={`mt-3 text-lg font-semibold ${isActiveSubscription ? "text-emerald-400" : "text-red-400"}`}
          >
            {isActiveSubscription ? "Active" : "Inactive"}
          </p>
          <p className="mt-1 text-sm text-zinc-300">{planLabel}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Renews {formatDate(subscription?.current_period_end ?? null)}
          </p>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Prize Draws Entered
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {drawResults.length}
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Based on your most recent entries
          </p>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Total Winnings
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {currencyFormat.format(totalWinnings)}
          </p>
          <p className="mt-2 text-xs text-zinc-400">Paid prizes only</p>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Charity Contribution
          </p>
          <p className="mt-3 text-base font-semibold text-white">
            {charity?.name ?? "No charity selected"}
          </p>
          <p className="mt-2 text-xs text-zinc-400">Giving back every month</p>
        </article>
      </section>

      <ScoreEntry userId={userId} />

      <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
        <h2 className="text-xl font-semibold text-white">My Scores</h2>
        {scoreCards.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">No scores entered yet</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {scoreCards.map((score) => (
              <article
                key={score.id}
                className="rounded-xl border border-zinc-700 bg-zinc-900 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Played {formatDate(score.played_at)}
                </p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {score.score}
                </p>
                <p className="text-sm text-zinc-400">pts</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
        <h2 className="text-xl font-semibold text-white">
          Charity & Contribution
        </h2>
        <p className="mt-4 text-sm text-zinc-400">Current charity</p>
        <p className="mt-1 text-lg font-semibold text-zinc-100">
          {charity?.name ?? "No charity selected"}
        </p>
        {charity?.description ? (
          <p className="mt-2 text-sm text-zinc-400">{charity.description}</p>
        ) : null}
        <p className="mt-4 text-sm text-zinc-300">
          Contribution:{" "}
          <span className="font-semibold text-white">
            {profile?.charity_pct ?? 10}%
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">Minimum 10%</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/charity"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Change Charity
          </Link>
          <Link
            href="/dashboard/donate"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Donate Directly
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
        <h2 className="text-xl font-semibold text-white">
          Recent Draw Results
        </h2>
        {drawResults.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            No draw results yet. Enter your scores to participate!
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-155 table-auto border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="border-b border-zinc-800 pb-3 pr-3">Month</th>
                  <th className="border-b border-zinc-800 pb-3 pr-3">Match</th>
                  <th className="border-b border-zinc-800 pb-3 pr-3">Prize</th>
                  <th className="border-b border-zinc-800 pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {drawResults.map((result) => (
                  <tr key={result.id} className="text-sm text-zinc-200">
                    <td className="border-b border-zinc-900 py-3 pr-3">
                      {formatMonth(result.draws?.month ?? null)}
                    </td>
                    <td className="border-b border-zinc-900 py-3 pr-3">
                      {matchTypeLabel(result.match_type)}
                    </td>
                    <td className="border-b border-zinc-900 py-3 pr-3">
                      {currencyFormat.format(
                        Number(result.individual_share ?? 0),
                      )}
                    </td>
                    <td className="border-b border-zinc-900 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${paymentStatusClasses(
                          result.payment_status,
                        )}`}
                      >
                        {result.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
        <h2 className="text-xl font-semibold text-white">
          Subscription Management
        </h2>
        <p className="mt-4 text-sm text-zinc-400">Current plan</p>
        <p className="mt-1 text-lg font-semibold text-zinc-100">{planLabel}</p>
        <p
          className={`mt-2 text-sm ${isActiveSubscription ? "text-emerald-400" : "text-red-400"}`}
        >
          Status: {isActiveSubscription ? "Active" : "Inactive"}
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Renewal: {formatDate(subscription?.current_period_end ?? null)}
        </p>

        {!isActiveSubscription ? (
          <Link
            href="/subscribe"
            className="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Manage Subscription
          </Link>
        ) : (
          <p className="mt-5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            Your subscription is active. Cancellation details are available from
            support.
          </p>
        )}
      </section>
    </div>
  );
}
