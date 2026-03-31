"use client";

import { useEffect, useMemo, useState } from "react";

type AnalyticsData = {
  activeSubscribers: number;
  totalPrizePoolThisMonth: number;
  totalPaidOut: number;
  totalCharityContributions: number;
};

type UserRow = {
  id: string;
  full_name: string | null;
  subscriptions: Array<{
    plan: "monthly" | "yearly";
    status: string;
    current_period_end: string | null;
  }> | null;
};

type DrawRow = {
  id: number;
  month: string;
  draw_mode: string;
  status: string;
  numbers: number[];
  jackpot_amount: number;
};

type WinnerRow = {
  id: number;
  match_type: number;
  individual_share: number;
  payment_status: "pending" | "approved" | "paid" | "rejected";
  profiles: { full_name: string | null } | null;
  draws: { month: string; numbers: number[] } | null;
};

type RunDrawResponse = {
  drawId: number;
  numbers: number[];
  winners: {
    fiveMatch: number;
    fourMatch: number;
    threeMatch: number;
  };
  prizePool: {
    total: number;
    jackpot: number;
    fourMatch: number;
    threeMatch: number;
  };
};

type AdminPanelProps = {
  analytics: AnalyticsData;
};

type TabKey = "users" | "draws" | "winners" | "analytics";

const tabList: Array<{ key: TabKey; label: string }> = [
  { key: "users", label: "Users" },
  { key: "draws", label: "Draws" },
  { key: "winners", label: "Winners" },
  { key: "analytics", label: "Analytics" },
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
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
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

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

export default function AdminPanel({ analytics }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDraws, setLoadingDraws] = useState(false);
  const [loadingWinners, setLoadingWinners] = useState(false);

  const [monthInput, setMonthInput] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [drawMode, setDrawMode] = useState<"random" | "algorithmic">("random");
  const [runningDraw, setRunningDraw] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunDrawResponse | null>(null);
  const [updatingWinnerId, setUpdatingWinnerId] = useState<number | null>(null);

  const totalUsers = users.length;

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as {
        users?: UserRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load users");
      }
      setUsers(payload.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDraws = async () => {
    setLoadingDraws(true);
    try {
      const response = await fetch("/api/admin/draws", { cache: "no-store" });
      const payload = (await response.json()) as {
        draws?: DrawRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load draws");
      }
      setDraws(payload.draws ?? []);
    } catch {
      setDraws([]);
    } finally {
      setLoadingDraws(false);
    }
  };

  const loadWinners = async () => {
    setLoadingWinners(true);
    try {
      const response = await fetch("/api/admin/winners", { cache: "no-store" });
      const payload = (await response.json()) as {
        winners?: WinnerRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load winners");
      }
      setWinners(payload.winners ?? []);
    } catch {
      setWinners([]);
    } finally {
      setLoadingWinners(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadUsers(), loadDraws(), loadWinners()]);
  }, []);

  const canRunDraw = useMemo(
    () => monthInput.length === 7 && !runningDraw,
    [monthInput, runningDraw],
  );

  const runDraw = async () => {
    if (!canRunDraw) {
      return;
    }

    setRunningDraw(true);
    setRunError(null);
    setRunResult(null);

    try {
      const month = `${monthInput}-01`;
      const response = await fetch("/api/admin/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, drawMode }),
      });

      const payload = (await response.json()) as RunDrawResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to run draw");
      }

      setRunResult(payload);
      await Promise.all([loadDraws(), loadWinners()]);
    } catch (error) {
      setRunError(
        error instanceof Error ? error.message : "Failed to run draw",
      );
    } finally {
      setRunningDraw(false);
    }
  };

  const publishDraw = async (drawId: number) => {
    const response = await fetch(`/api/admin/draws/${drawId}/publish`, {
      method: "POST",
    });

    if (response.ok) {
      await loadDraws();
    }
  };

  const updateWinnerStatus = async (
    resultId: number,
    paymentStatus: WinnerRow["payment_status"],
  ) => {
    setUpdatingWinnerId(resultId);

    try {
      const response = await fetch("/api/admin/winners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, paymentStatus }),
      });

      if (response.ok) {
        await loadWinners();
      }
    } finally {
      setUpdatingWinnerId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabList.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-emerald-500 text-emerald-950"
                : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" ? (
        <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
          <h2 className="text-xl font-semibold text-white">Users</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Total users: {totalUsers}
          </p>

          {loadingUsers ? (
            <p className="mt-4 text-sm text-zinc-400">Loading users...</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Full Name
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Email/User ID
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">Plan</th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Status
                    </th>
                    <th className="border-b border-zinc-800 pb-2">
                      Subscription End
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const sub = user.subscriptions?.[0];
                    return (
                      <tr key={user.id} className="text-zinc-200">
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {user.full_name ?? "N/A"}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {user.id}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {sub?.plan ?? "N/A"}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {sub?.status ?? "inactive"}
                        </td>
                        <td className="border-b border-zinc-900 py-3">
                          {formatDate(sub?.current_period_end ?? null)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "draws" ? (
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
          <h2 className="text-xl font-semibold text-white">Draws</h2>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              Run New Draw
            </h3>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block">Month</span>
                <input
                  type="month"
                  value={monthInput}
                  onChange={(event) => setMonthInput(event.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                />
              </label>

              <label className="text-sm text-zinc-300">
                <span className="mb-1 block">Draw Mode</span>
                <select
                  value={drawMode}
                  onChange={(event) =>
                    setDrawMode(event.target.value as "random" | "algorithmic")
                  }
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                >
                  <option value="random">Random</option>
                  <option value="algorithmic">Algorithmic</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => void runDraw()}
                disabled={!canRunDraw}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningDraw ? "Running..." : "Run Draw"}
              </button>
            </div>

            {runError ? (
              <p className="mt-3 text-sm text-red-400">{runError}</p>
            ) : null}

            {runResult ? (
              <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <p>Draw ID: {runResult.drawId}</p>
                <p>Numbers: {runResult.numbers.join(", ")}</p>
                <p>
                  Winners: 5-match {runResult.winners.fiveMatch}, 4-match{" "}
                  {runResult.winners.fourMatch}, 3-match{" "}
                  {runResult.winners.threeMatch}
                </p>
                <p>
                  Pools: Jackpot{" "}
                  {currencyFormatter.format(runResult.prizePool.jackpot)},
                  4-match{" "}
                  {currencyFormatter.format(runResult.prizePool.fourMatch)},
                  3-match{" "}
                  {currencyFormatter.format(runResult.prizePool.threeMatch)}
                </p>
              </div>
            ) : null}
          </div>

          {loadingDraws ? (
            <p className="text-sm text-zinc-400">Loading draws...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Month
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">Mode</th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Status
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Numbers
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Jackpot
                    </th>
                    <th className="border-b border-zinc-800 pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.map((draw) => (
                    <tr key={draw.id} className="text-zinc-200">
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {formatMonth(draw.month)}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3 capitalize">
                        {draw.draw_mode}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3 capitalize">
                        {draw.status}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {Array.isArray(draw.numbers)
                          ? draw.numbers.join(", ")
                          : "N/A"}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {currencyFormatter.format(
                          Number(draw.jackpot_amount ?? 0),
                        )}
                      </td>
                      <td className="border-b border-zinc-900 py-3">
                        {draw.status === "simulated" ? (
                          <button
                            type="button"
                            onClick={() => void publishDraw(draw.id)}
                            className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                          >
                            Publish
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Published
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "winners" ? (
        <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
          <h2 className="text-xl font-semibold text-white">Winners</h2>

          {loadingWinners ? (
            <p className="mt-3 text-sm text-zinc-400">Loading winners...</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="border-b border-zinc-800 pb-2 pr-3">Name</th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Draw Month
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Match Type
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Prize Amount
                    </th>
                    <th className="border-b border-zinc-800 pb-2">
                      Payment Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((winner) => (
                    <tr key={winner.id} className="text-zinc-200">
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {winner.profiles?.full_name ?? "Unknown"}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {formatMonth(winner.draws?.month ?? null)}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {winner.match_type} Number Match
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {currencyFormatter.format(
                          Number(winner.individual_share ?? 0),
                        )}
                      </td>
                      <td className="border-b border-zinc-900 py-3">
                        <select
                          value={winner.payment_status}
                          disabled={updatingWinnerId === winner.id}
                          onChange={(event) =>
                            void updateWinnerStatus(
                              winner.id,
                              event.target.value as WinnerRow["payment_status"],
                            )
                          }
                          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                        >
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="paid">paid</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "analytics" ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Active Subscribers
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {analytics.activeSubscribers}
            </p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Prize Pool (This Month)
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {currencyFormatter.format(analytics.totalPrizePoolThisMonth)}
            </p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Total Paid Out
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {currencyFormatter.format(analytics.totalPaidOut)}
            </p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Charity Contributions
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {currencyFormatter.format(analytics.totalCharityContributions)}
            </p>
          </article>
        </section>
      ) : null}
    </div>
  );
}
