"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanKey = "monthly" | "yearly";

const PRICE_IDS: Record<PlanKey, string> = {
  monthly: "price_1TBrDA3xAN263qsKYstmaCoX",
  yearly: "price_1TGpm33xAN263qsKkbno1I3n",
};

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (plan: PlanKey) => {
    setLoading(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: PRICE_IDS[plan],
          plan,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b1020_35%,#030712_100%)] px-6 py-12 text-zinc-100 md:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">
            Subscription
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Join the movement. Play golf. Change lives.
          </h1>
          <p className="mx-auto max-w-3xl text-base text-zinc-300 md:text-lg">
            Every subscription funds a charity you choose. Every score enters
            you into monthly prize draws.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 backdrop-blur">
            <h2 className="text-2xl font-semibold">Monthly</h2>
            <p className="mt-3 text-4xl font-bold">₹999/month</p>
            <ul className="mt-6 space-y-3 text-zinc-200">
              <li>Enter golf scores</li>
              <li>Monthly prize draw</li>
              <li>Charity contribution</li>
              <li>Cancel anytime</li>
            </ul>
            <button
              type="button"
              onClick={() => void handleCheckout("monthly")}
              disabled={loading !== null}
              className="mt-8 w-full rounded-xl bg-zinc-100 px-4 py-3 font-semibold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "monthly" ? "Redirecting..." : "Subscribe Monthly"}
            </button>
          </article>

          <article className="relative rounded-3xl border border-emerald-400/80 bg-zinc-900/80 p-8 shadow-[0_0_35px_rgba(16,185,129,0.25)] backdrop-blur">
            <span className="absolute right-6 top-6 rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-950">
              Save 17%
            </span>
            <h2 className="text-2xl font-semibold">Yearly</h2>
            <p className="mt-3 text-4xl font-bold">₹9,999/year</p>
            <ul className="mt-6 space-y-3 text-zinc-200">
              <li>Enter golf scores</li>
              <li>Monthly prize draw</li>
              <li>Charity contribution</li>
              <li>Cancel anytime</li>
              <li>Priority support</li>
            </ul>
            <button
              type="button"
              onClick={() => void handleCheckout("yearly")}
              disabled={loading !== null}
              className="mt-8 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "yearly" ? "Redirecting..." : "Subscribe Yearly"}
            </button>
          </article>
        </div>

        {error ? (
          <div className="mx-auto w-full max-w-2xl rounded-xl border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-center text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mx-auto text-sm text-zinc-400 underline-offset-4 transition hover:text-zinc-200 hover:underline"
        >
          Not now, take me back
        </button>
      </div>
    </main>
  );
}
