"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DrawProofItem = {
  id: number;
  match_type: number;
  payment_status: "pending" | "approved" | "paid" | "rejected";
  proof_url?: string | null;
  draws: {
    month: string;
  } | null;
};

type WinnerProofSubmissionProps = {
  items: DrawProofItem[];
};

function formatMonth(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function WinnerProofSubmission({
  items,
}: WinnerProofSubmissionProps) {
  const router = useRouter();
  const [proofById, setProofById] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.proof_url ?? ""])),
  );
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitProof = async (id: number) => {
    setLoadingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/draw-results/${id}/proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofUrl: proofById[id] ?? "" }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to submit proof.");
        return;
      }

      setSuccess("Proof submitted successfully.");
      router.refresh();
    } catch {
      setError("Unable to submit proof.");
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
      <h2 className="text-xl font-semibold text-white">Winner Verification</h2>
      <p className="mt-2 text-sm text-zinc-400">
        If you have a winning match, submit your score proof URL for admin
        verification.
      </p>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-4"
          >
            <p className="text-sm font-semibold text-zinc-100">
              {item.match_type} Number Match ·{" "}
              {formatMonth(item.draws?.month ?? null)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Status: {item.payment_status}
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                placeholder="https://..."
                value={proofById[item.id] ?? ""}
                onChange={(event) =>
                  setProofById((previous) => ({
                    ...previous,
                    [item.id]: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => void submitProof(item.id)}
                disabled={loadingId === item.id}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingId === item.id ? "Submitting..." : "Submit Proof"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {success ? (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
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
