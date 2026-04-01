import Link from "next/link";
import { redirect } from "next/navigation";
import CharityContributionForm from "@/app/components/CharityContributionForm";
import ScoreEntry from "@/app/components/ScoreEntry";
import ScoreManager from "@/app/components/ScoreManager";
import { createClient } from "@/lib/supabase/server";

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

type CharityOption = {
  id: number;
  name: string;
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

function drawStatusClasses(status: string | null | undefined) {
  if (status === "published") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (status === "simulated") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  }
  return "border-zinc-600/60 bg-zinc-700/40 text-zinc-300";
}

function getNextDrawDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function getDaysUntil(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const scoresPromise = supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const drawResultsPromise = supabase
    .from("draw_results")
    .select(
      "id, match_type, individual_share, payment_status, created_at, draws!inner(month, numbers, status)",
    )
    .eq("user_id", userId)
    .eq("draws.status", "published")
    .order("created_at", { ascending: false })
    .limit(10);

  const charitiesPromise = supabase
    .from("charities")
    .select("id, name")
    .order("name", { ascending: true });

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
    charitiesResult,
  ] = await Promise.all([
    profilePromise,
    subscriptionPromise,
    scoresPromise,
    charityPromise,
    drawResultsPromise,
    charitiesPromise,
  ]);

  const profile = (profileResult.data as Profile | null) ?? null;
  const subscription = (subscriptionResult.data as Subscription | null) ?? null;
  const scores = (scoresResult.data as Score[] | null) ?? [];
  const charity = (charityResult.data as Charity | null) ?? null;
  const drawResults = (drawResultsResult.data as DrawResult[] | null) ?? [];
  const charities = (charitiesResult.data as CharityOption[] | null) ?? [];

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
  const isActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";
  const planLabel = subscription?.plan
    ? `${subscription.plan.charAt(0).toUpperCase()}${subscription.plan.slice(1)}`
    : "No active plan";

  const nextDrawDate = getNextDrawDate();
  const nextDrawInDays = getDaysUntil(nextDrawDate);

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
            Participation
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {drawResults.length}
          </p>
          <p className="mt-2 text-xs text-zinc-400">Draw results recorded</p>
          <p className="mt-2 text-xs text-zinc-400">
            Next draw in {nextDrawInDays} days (
            {formatDate(nextDrawDate.toISOString())})
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

      <ScoreEntry />

      <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
        <h2 className="text-xl font-semibold text-white">My Scores</h2>
        {scoreCards.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">No scores entered yet</p>
        ) : (
          <div className="mt-5">
            <ScoreManager scores={scoreCards} />
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
        <div className="mt-5">
          <CharityContributionForm
            charities={charities}
            currentCharityId={profile?.charity_id ?? null}
            currentCharityPct={profile?.charity_pct ?? 10}
          />
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
                  <th className="border-b border-zinc-800 pb-3 pr-3">
                    Draw Status
                  </th>
                  <th className="border-b border-zinc-800 pb-3">
                    Payout Status
                  </th>
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
                    <td className="border-b border-zinc-900 py-3 pr-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${drawStatusClasses(
                          result.draws?.status,
                        )}`}
                      >
                        {result.draws?.status ?? "unknown"}
                      </span>
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
