"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ScoreEntryProps = {
  userId: string;
};

function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0] ?? "";
}

export default function ScoreEntry({ userId }: ScoreEntryProps) {
  const router = useRouter();
  const [score, setScore] = useState<string>("");
  const [playedAt, setPlayedAt] = useState<string>(getTodayIsoDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const parsedScore = Number(score);
    if (!Number.isFinite(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      setError("Score must be between 1 and 45.");
      return;
    }

    if (!playedAt) {
      setError("Please select a date played.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("scores").insert({
        user_id: userId,
        score: parsedScore,
        played_at: playedAt,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess(true);
      setScore("");
      setPlayedAt(getTodayIsoDate());
      router.refresh();
    } catch {
      setError("Unable to add score. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
      <h2 className="text-xl font-semibold text-white">Score Entry</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Add your latest Stableford score to enter upcoming prize draws.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-300">Score</span>
          <input
            type="number"
            min={1}
            max={45}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            placeholder="Enter score (1-45)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-emerald-500"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-zinc-300">Date Played</span>
          <input
            type="date"
            value={playedAt}
            max={getTodayIsoDate()}
            onChange={(event) => setPlayedAt(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-0 transition focus:border-emerald-500"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add Score"}
        </button>
      </form>

      {success ? (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Score added successfully!
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
