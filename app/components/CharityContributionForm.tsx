"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CharityOption = {
  id: number;
  name: string;
};

type CharityContributionFormProps = {
  charities: CharityOption[];
  currentCharityId: number | null;
  currentCharityPct: number;
};

export default function CharityContributionForm({
  charities,
  currentCharityId,
  currentCharityPct,
}: CharityContributionFormProps) {
  const router = useRouter();
  const [charityId, setCharityId] = useState<string>(
    currentCharityId ? String(currentCharityId) : "",
  );
  const [charityPct, setCharityPct] = useState<number>(currentCharityPct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCharityId = charityId ? Number(charityId) : null;
  const donateHref = selectedCharityId
    ? `/charities/${selectedCharityId}`
    : "/charities";

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charityId: selectedCharityId,
          charityPct,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to save charity preferences.");
        return;
      }

      setSuccess("Charity preferences updated.");
      router.refresh();
    } catch {
      setError("Unable to save charity preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">Select charity</span>
        <select
          value={charityId}
          onChange={(event) => setCharityId(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
        >
          <option value="">Choose a charity</option>
          {charities.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <label className="mb-2 block text-sm text-zinc-300">
          Contribution Percentage:{" "}
          <span className="font-semibold text-white">{charityPct}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={100}
          value={charityPct}
          onChange={(event) => setCharityPct(Number(event.target.value))}
          className="w-full accent-emerald-500"
        />
        <p className="mt-1 text-xs text-zinc-500">Minimum 10%</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Preferences"}
        </button>
        <Link
          href={donateHref}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          Donate Directly
        </Link>
      </div>

      {success ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
