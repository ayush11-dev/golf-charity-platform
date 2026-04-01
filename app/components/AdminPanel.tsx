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
    id?: number;
    plan: "monthly" | "yearly";
    status: string;
    current_period_end: string | null;
  }> | null;
};

type SubscriptionDraft = {
  plan: "monthly" | "yearly";
  status: string;
  current_period_end: string;
};

type AdminScoreRow = {
  id: number;
  user_id: string;
  score: number;
  played_at: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

type DrawRow = {
  id: number;
  month: string;
  draw_mode: string;
  status: string;
  numbers: number[];
  jackpot_amount: number;
};

type CharityRow = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  featured: boolean;
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

type TabKey =
  | "users"
  | "scores"
  | "draws"
  | "winners"
  | "charities"
  | "analytics";

const tabList: Array<{ key: TabKey; label: string }> = [
  { key: "users", label: "Users" },
  { key: "scores", label: "Scores" },
  { key: "draws", label: "Draws" },
  { key: "winners", label: "Winners" },
  { key: "charities", label: "Charities" },
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
  const [userSubscriptionDrafts, setUserSubscriptionDrafts] = useState<
    Record<string, SubscriptionDraft>
  >({});
  const [savingSubscriptionUserId, setSavingSubscriptionUserId] = useState<
    string | null
  >(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );

  const [scores, setScores] = useState<AdminScoreRow[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [editingScoreId, setEditingScoreId] = useState<number | null>(null);
  const [editingScoreValue, setEditingScoreValue] = useState<string>("");
  const [editingScoreDate, setEditingScoreDate] = useState<string>("");
  const [savingScoreId, setSavingScoreId] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [charities, setCharities] = useState<CharityRow[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDraws, setLoadingDraws] = useState(false);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [loadingCharities, setLoadingCharities] = useState(false);

  const [monthInput, setMonthInput] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [drawMode, setDrawMode] = useState<"random" | "algorithmic">("random");
  const [runningDraw, setRunningDraw] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunDrawResponse | null>(null);
  const [editingCharityId, setEditingCharityId] = useState<number | null>(null);
  const [charityName, setCharityName] = useState("");
  const [charityDescription, setCharityDescription] = useState("");
  const [charityImageUrl, setCharityImageUrl] = useState("");
  const [charityFeatured, setCharityFeatured] = useState(false);
  const [charityError, setCharityError] = useState<string | null>(null);
  const [submittingCharity, setSubmittingCharity] = useState(false);

  const totalUsers = users.length;

  const loadUsers = async () => {
    setLoadingUsers(true);
    setSubscriptionError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as {
        users?: UserRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load users");
      }
      const nextUsers = payload.users ?? [];
      setUsers(nextUsers);

      const drafts: Record<string, SubscriptionDraft> = {};
      for (const user of nextUsers) {
        const sub = user.subscriptions?.[0];
        drafts[user.id] = {
          plan: sub?.plan ?? "monthly",
          status: sub?.status ?? "inactive",
          current_period_end: sub?.current_period_end
            ? (sub.current_period_end.split("T")[0] ?? "")
            : "",
        };
      }
      setUserSubscriptionDrafts(drafts);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadScores = async () => {
    setLoadingScores(true);
    setScoreError(null);
    try {
      const response = await fetch("/api/admin/scores", { cache: "no-store" });
      const payload = (await response.json()) as {
        scores?: AdminScoreRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load scores");
      }
      setScores(payload.scores ?? []);
    } catch {
      setScores([]);
    } finally {
      setLoadingScores(false);
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

  const loadCharities = async () => {
    setLoadingCharities(true);
    try {
      const response = await fetch("/api/admin/charities", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        charities?: CharityRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load charities");
      }
      setCharities(payload.charities ?? []);
    } catch {
      setCharities([]);
    } finally {
      setLoadingCharities(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      loadUsers(),
      loadScores(),
      loadDraws(),
      loadWinners(),
      loadCharities(),
    ]);
  }, []);

  const updateSubscriptionDraft = (
    userId: string,
    key: keyof SubscriptionDraft,
    value: string,
  ) => {
    setUserSubscriptionDrafts((previous) => ({
      ...previous,
      [userId]: {
        ...(previous[userId] ?? {
          plan: "monthly",
          status: "inactive",
          current_period_end: "",
        }),
        [key]: value,
      },
    }));
  };

  const saveSubscription = async (userId: string) => {
    const draft = userSubscriptionDrafts[userId];
    if (!draft) {
      return;
    }

    setSavingSubscriptionUserId(userId);
    setSubscriptionError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: draft.plan,
          status: draft.status,
          current_period_end: draft.current_period_end || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setSubscriptionError(payload.error ?? "Unable to save subscription");
        return;
      }

      await loadUsers();
    } catch {
      setSubscriptionError("Unable to save subscription");
    } finally {
      setSavingSubscriptionUserId(null);
    }
  };

  const startEditScore = (score: AdminScoreRow) => {
    setEditingScoreId(score.id);
    setEditingScoreValue(String(score.score));
    setEditingScoreDate(score.played_at.split("T")[0] ?? score.played_at);
    setScoreError(null);
  };

  const cancelEditScore = () => {
    setEditingScoreId(null);
    setEditingScoreValue("");
    setEditingScoreDate("");
  };

  const saveScore = async (scoreId: number) => {
    setSavingScoreId(scoreId);
    setScoreError(null);

    const parsedScore = Number(editingScoreValue);
    if (!Number.isFinite(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      setScoreError("Score must be between 1 and 45.");
      setSavingScoreId(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/scores/${scoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: parsedScore,
          played_at: editingScoreDate,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setScoreError(payload.error ?? "Unable to update score");
        return;
      }

      cancelEditScore();
      await loadScores();
    } catch {
      setScoreError("Unable to update score");
    } finally {
      setSavingScoreId(null);
    }
  };

  const deleteScore = async (scoreId: number) => {
    setSavingScoreId(scoreId);
    setScoreError(null);

    try {
      const response = await fetch(`/api/admin/scores/${scoreId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setScoreError(payload.error ?? "Unable to delete score");
        return;
      }

      if (editingScoreId === scoreId) {
        cancelEditScore();
      }
      await loadScores();
    } catch {
      setScoreError("Unable to delete score");
    } finally {
      setSavingScoreId(null);
    }
  };

  const resetCharityForm = () => {
    setEditingCharityId(null);
    setCharityName("");
    setCharityDescription("");
    setCharityImageUrl("");
    setCharityFeatured(false);
  };

  const startEditCharity = (charity: CharityRow) => {
    setEditingCharityId(charity.id);
    setCharityName(charity.name);
    setCharityDescription(charity.description ?? "");
    setCharityImageUrl(charity.image_url ?? "");
    setCharityFeatured(charity.featured);
    setCharityError(null);
  };

  const submitCharity = async () => {
    setSubmittingCharity(true);
    setCharityError(null);

    try {
      const payload = {
        name: charityName,
        description: charityDescription || null,
        image_url: charityImageUrl || null,
        featured: charityFeatured,
      };

      const url = editingCharityId
        ? `/api/admin/charities/${editingCharityId}`
        : "/api/admin/charities";
      const method = editingCharityId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setCharityError(data.error ?? "Unable to save charity");
        return;
      }

      resetCharityForm();
      await loadCharities();
    } catch {
      setCharityError("Unable to save charity");
    } finally {
      setSubmittingCharity(false);
    }
  };

  const deleteCharity = async (charityId: number) => {
    const response = await fetch(`/api/admin/charities/${charityId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      if (editingCharityId === charityId) {
        resetCharityForm();
      }
      await loadCharities();
    }
  };

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
          {subscriptionError ? (
            <p className="mt-3 text-sm text-red-400">{subscriptionError}</p>
          ) : null}

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
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Renewal Date
                    </th>
                    <th className="border-b border-zinc-800 pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const draft = userSubscriptionDrafts[user.id] ?? {
                      plan: "monthly",
                      status: "inactive",
                      current_period_end: "",
                    };

                    return (
                      <tr key={user.id} className="text-zinc-200">
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {user.full_name ?? "N/A"}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {user.id}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          <select
                            value={draft.plan}
                            onChange={(event) =>
                              updateSubscriptionDraft(
                                user.id,
                                "plan",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                          >
                            <option value="monthly">monthly</option>
                            <option value="yearly">yearly</option>
                          </select>
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              updateSubscriptionDraft(
                                user.id,
                                "status",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="cancelled">cancelled</option>
                            <option value="trialing">trialing</option>
                            <option value="past_due">past_due</option>
                            <option value="unpaid">unpaid</option>
                          </select>
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          <input
                            type="date"
                            value={draft.current_period_end}
                            onChange={(event) =>
                              updateSubscriptionDraft(
                                user.id,
                                "current_period_end",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                          />
                        </td>
                        <td className="border-b border-zinc-900 py-3">
                          <button
                            type="button"
                            onClick={() => void saveSubscription(user.id)}
                            disabled={savingSubscriptionUserId === user.id}
                            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {savingSubscriptionUserId === user.id
                              ? "Saving..."
                              : "Save"}
                          </button>
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

      {activeTab === "scores" ? (
        <section className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
          <h2 className="text-xl font-semibold text-white">Scores</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Edit or remove any submitted user score.
          </p>
          {scoreError ? (
            <p className="mt-3 text-sm text-red-400">{scoreError}</p>
          ) : null}

          {loadingScores ? (
            <p className="mt-4 text-sm text-zinc-400">Loading scores...</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="border-b border-zinc-800 pb-2 pr-3">User</th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      User ID
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Score
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Played At
                    </th>
                    <th className="border-b border-zinc-800 pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score) => {
                    const isEditing = editingScoreId === score.id;
                    const isSaving = savingScoreId === score.id;

                    return (
                      <tr key={score.id} className="text-zinc-200">
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {score.profiles?.full_name ?? "Unknown"}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {score.user_id}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              max={45}
                              value={editingScoreValue}
                              onChange={(event) =>
                                setEditingScoreValue(event.target.value)
                              }
                              className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                            />
                          ) : (
                            score.score
                          )}
                        </td>
                        <td className="border-b border-zinc-900 py-3 pr-3">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editingScoreDate}
                              onChange={(event) =>
                                setEditingScoreDate(event.target.value)
                              }
                              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                            />
                          ) : (
                            formatDate(score.played_at)
                          )}
                        </td>
                        <td className="border-b border-zinc-900 py-3">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void saveScore(score.id)}
                                  disabled={isSaving}
                                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditScore}
                                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditScore(score)}
                                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void deleteScore(score.id)}
                              disabled={isSaving}
                              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
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
                        <span className="capitalize text-zinc-200">
                          {winner.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "charities" ? (
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
          <h2 className="text-xl font-semibold text-white">Charities</h2>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">
              {editingCharityId ? "Edit Charity" : "Add Charity"}
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block">Name</span>
                <input
                  type="text"
                  value={charityName}
                  onChange={(event) => setCharityName(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                />
              </label>

              <label className="text-sm text-zinc-300">
                <span className="mb-1 block">Image URL</span>
                <input
                  type="url"
                  value={charityImageUrl}
                  onChange={(event) => setCharityImageUrl(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm text-zinc-300">
              <span className="mb-1 block">Description</span>
              <textarea
                value={charityDescription}
                onChange={(event) => setCharityDescription(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={charityFeatured}
                onChange={(event) => setCharityFeatured(event.target.checked)}
              />
              Featured charity
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void submitCharity()}
                disabled={submittingCharity}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {submittingCharity
                  ? "Saving..."
                  : editingCharityId
                    ? "Update Charity"
                    : "Add Charity"}
              </button>
              {editingCharityId ? (
                <button
                  type="button"
                  onClick={resetCharityForm}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            {charityError ? (
              <p className="mt-3 text-sm text-red-400">{charityError}</p>
            ) : null}
          </div>

          {loadingCharities ? (
            <p className="text-sm text-zinc-400">Loading charities...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="border-b border-zinc-800 pb-2 pr-3">Name</th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Featured
                    </th>
                    <th className="border-b border-zinc-800 pb-2 pr-3">
                      Image
                    </th>
                    <th className="border-b border-zinc-800 pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {charities.map((charity) => (
                    <tr key={charity.id} className="text-zinc-200">
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {charity.name}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {charity.featured ? "Yes" : "No"}
                      </td>
                      <td className="border-b border-zinc-900 py-3 pr-3">
                        {charity.image_url ? (
                          <a
                            href={charity.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-300 underline-offset-2 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-zinc-500">N/A</span>
                        )}
                      </td>
                      <td className="border-b border-zinc-900 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditCharity(charity)}
                            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCharity(charity.id)}
                            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300"
                          >
                            Delete
                          </button>
                        </div>
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
