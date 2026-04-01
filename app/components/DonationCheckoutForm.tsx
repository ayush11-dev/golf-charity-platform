"use client";

import { useState } from "react";

type DonationCheckoutFormProps = {
  charityId: number;
  charityName: string;
};

export default function DonationCheckoutForm({
  charityId,
  charityName,
}: DonationCheckoutFormProps) {
  const [amount, setAmount] = useState<string>("500");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDonate = async () => {
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
      setError("Minimum donation amount is INR 100.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charityId,
          amount: parsedAmount,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to start donation checkout.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
          Independent Donation
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">
          Support {charityName}
        </h2>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-700">
          Amount (INR)
        </span>
        <input
          type="number"
          min={100}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition focus:border-zinc-500"
        />
      </label>

      <button
        type="button"
        onClick={() => void handleDonate()}
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Redirecting..." : "Donate via Stripe"}
      </button>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
