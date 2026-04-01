import Link from "next/link";
import PublicNavbar from "@/app/components/PublicNavbar";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Charity = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
};

const MONTHLY_FEE = 999;

const currencyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const [featuredCharityResult, activeSubsResult] = await Promise.all([
    supabaseAdmin
      .from("charities")
      .select("id, name, description, image_url")
      .eq("featured", true)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const featuredCharity =
    (featuredCharityResult.data as Charity | null) ?? null;
  const activeSubscribers = activeSubsResult.count ?? 0;
  const livePrizePool = activeSubscribers * MONTHLY_FEE;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <PublicNavbar />

      <section className="relative overflow-hidden border-b border-zinc-800 bg-[radial-gradient(circle_at_20%_20%,#1f2937_0%,#0b1020_38%,#0a0a0a_100%)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 md:flex-row md:items-end md:py-24 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <p className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Golf For Good
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Win monthly prizes while funding life-changing charity work.
            </h1>
            <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
              Subscribe, submit your last five Stableford scores, and enter a
              monthly draw where every attempt also powers your chosen cause.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/subscribe"
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                Subscribe Now
              </Link>
              <Link
                href="/charities"
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                Explore Charities
              </Link>
            </div>
          </div>

          <aside className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#1a1a1a]/95 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Live Prize Pool
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {currencyFormat.format(livePrizePool)}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Based on {activeSubscribers} active subscribers this month.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
              Step 1
            </p>
            <h2 className="mt-2 text-xl font-semibold">Subscribe</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Choose monthly or yearly access and unlock draw participation.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
              Step 2
            </p>
            <h2 className="mt-2 text-xl font-semibold">Add 5 Scores</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Enter your latest Stableford scores and stay automatically
              draw-ready.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
              Step 3
            </p>
            <h2 className="mt-2 text-xl font-semibold">Win + Give</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Every subscription builds prize tiers and a direct impact for
              charities.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#1a1a1a]">
          <div
            className="h-56 w-full bg-cover bg-center sm:h-64"
            style={{
              backgroundImage: `url(${featuredCharity?.image_url ?? "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200"})`,
            }}
          />
          <div className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Featured Charity
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {featuredCharity?.name ?? "Community Impact Partner"}
            </h2>
            <p className="text-sm text-zinc-400">
              {featuredCharity?.description ??
                "We partner with organizations that use sport-led programs to improve education, health, and social mobility."}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={
                  featuredCharity
                    ? `/charities/${featuredCharity.id}`
                    : "/charities"
                }
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                View Charity
              </Link>
              <Link
                href="/charities"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                Browse All Charities
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
