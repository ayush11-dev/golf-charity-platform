"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ScoreItem = {
  id: number;
  score: number;
  played_at: string;
};

type ScoreManagerProps = {
  scores: ScoreItem[];
};

function toIsoDate(value: string) {
  return value.split("T")[0] ?? value;
}

export default function ScoreManager({ scores }: ScoreManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scoreValue, setScoreValue] = useState<string>("");
  const [playedAtValue, setPlayedAtValue] = useState<string>("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (score: ScoreItem) => {
    setEditingId(score.id);
    setScoreValue(String(score.score));
    setPlayedAtValue(toIsoDate(score.played_at));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setScoreValue("");
    setPlayedAtValue("");
  };

  const saveEdit = async (scoreId: number) => {
    setLoadingId(scoreId);
    setError(null);

    const parsedScore = Number(scoreValue);
    if (!Number.isFinite(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      setError("Score must be between 1 and 45.");
      setLoadingId(null);
      return;
    }

    if (!playedAtValue) {
      setError("Please select a played date.");
      setLoadingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/scores/${scoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: parsedScore, playedAt: playedAtValue }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to update score.");
        return;
      }

      cancelEdit();
      router.refresh();
    } catch {
      setError("Unable to update score.");
    } finally {
      setLoadingId(null);
    }
  };

  const deleteScore = async (scoreId: number) => {
    setLoadingId(scoreId);
    setError(null);

    try {
      const response = await fetch(`/api/scores/${scoreId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to delete score.");
        return;
      }

      if (editingId === scoreId) {
        cancelEdit();
      }
      router.refresh();
    } catch {
      setError("Unable to delete score.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="space-y-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <p>{error}</p>
          {error.toLowerCase().includes("active subscription required") ? (
            <Link
              href="/subscribe"
              className="inline-flex rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              Take Subscription
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {scores.map((score) => {
          const isEditing = editingId === score.id;
          const isLoading = loadingId === score.id;

          return (
            <article
              key={score.id}
              className="rounded-xl border border-zinc-700 bg-zinc-900 p-4"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                      Score
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={scoreValue}
                      onChange={(event) => setScoreValue(event.target.value)}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                      Played Date
                    </span>
                    <input
                      type="date"
                      value={playedAtValue}
                      onChange={(event) => setPlayedAtValue(event.target.value)}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit(score.id)}
                      disabled={isLoading}
                      className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Played {toIsoDate(score.played_at)}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-white">
                    {score.score}
                  </p>
                  <p className="text-sm text-zinc-400">pts</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(score)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteScore(score.id)}
                      disabled={isLoading}
                      className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
