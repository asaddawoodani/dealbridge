"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wallet,
  Flag,
  XCircle,
} from "lucide-react";

type Commitment = {
  id: string;
  deal_id: string;
  investor_id: string;
  amount: number;
  status: string;
  commitment_date: string;
  funded_date: string | null;
  notes: string | null;
  deals: { id: string; title: string; category: string | null } | null;
  profiles: { full_name: string | null; email: string } | null;
};

type Stats = {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  largeCount: number;
};

type Toast = { type: "success" | "error"; message: string } | null;

const STATUS_TABS = ["all", "committed", "funded", "completed", "cancelled"] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "border-gray-500/30 text-gray-400 bg-gray-500/10",
  committed: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  funded: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  completed: "border-teal-500/30 text-teal-400 bg-teal-500/10",
  cancelled: "border-red-500/30 text-red-400 bg-red-500/10",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function AdminInvestmentsPage() {
  const [loading, setLoading] = useState(true);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, totalAmount: 0, byStatus: {}, largeCount: 0 });
  const [q, setQ] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/investments");
    const json = await res.json().catch(() => null);
    setCommitments(json?.commitments ?? []);
    if (json?.stats) setStats(json.stats);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return commitments.filter((c) => {
      if (statusTab !== "all" && c.status !== statusTab) return false;
      if (!s) return true;
      const blob = [
        c.profiles?.full_name ?? "",
        c.profiles?.email ?? "",
        c.deals?.title ?? "",
        c.status,
        String(c.amount),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [commitments, q, statusTab]);

  const doAction = async (id: string, action: string) => {
    setActing(id);
    const notes = action === "flag" ? prompt("Flag notes (optional):") ?? "" : undefined;

    const res = await fetch(`/api/admin/investments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes || undefined }),
    });

    const json = await res.json().catch(() => null);
    setActing(null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Action failed" });
      return;
    }

    setToast({ type: "success", message: `${action.charAt(0).toUpperCase() + action.slice(1)} successful` });
    await loadData();
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Investment Oversight</h1>
          <p className="text-[--text-secondary] mt-2">
            Review and manage all investment commitments.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Commitments", value: stats.total, icon: DollarSign, color: "text-teal-400" },
            { label: "Total Capital", value: formatCurrency(stats.totalAmount), icon: Wallet, color: "text-emerald-400" },
            { label: "Active", value: (stats.byStatus.committed ?? 0) + (stats.byStatus.funded ?? 0), icon: TrendingUp, color: "text-blue-400" },
            { label: "Large (>$100K)", value: stats.largeCount, icon: AlertTriangle, color: "text-amber-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[--border] bg-[--bg-card] p-5"
            >
              <div className="flex items-center gap-2 text-xs text-[--text-muted] mb-2">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                {s.label}
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* List */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                  statusTab === tab
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                    : "border-[--border] text-[--text-secondary] hover:border-[--border-hover]",
                ].join(" ")}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab !== "all" && stats.byStatus[tab]
                  ? ` (${stats.byStatus[tab]})`
                  : ""}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-lg font-semibold">
              Commitments{" "}
              <span className="text-[--text-muted] text-sm">({filtered.length})</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--text-muted]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full sm:w-72 rounded-xl bg-[--bg-input] border border-[--border] pl-10 pr-4 py-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-sm text-[--text-primary] placeholder:text-[--text-muted]"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-[--text-secondary]">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-[--text-muted]">No commitments found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[--border] bg-[--bg-input] overflow-hidden"
                  >
                    {/* Summary row */}
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate">
                            {c.profiles?.full_name ?? c.profiles?.email ?? "Unknown"}
                          </div>
                          <span
                            className={[
                              "text-xs px-2 py-1 rounded-full border",
                              STATUS_BADGE[c.status] ?? "border-[--border] text-[--text-muted]",
                            ].join(" ")}
                          >
                            {c.status}
                          </span>
                          {c.amount >= 100_000 && (
                            <span className="text-xs px-2 py-1 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">
                              Large
                            </span>
                          )}
                          {c.notes?.startsWith("[FLAGGED]") && (
                            <span className="text-xs px-2 py-1 rounded-full border border-red-500/30 text-red-400 bg-red-500/10">
                              Flagged
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-[--text-muted] mt-1">
                          {c.deals?.title ?? "Unknown Deal"} &middot; {formatCurrency(c.amount)} &middot; {new Date(c.commitment_date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-lg font-bold">{formatCurrency(c.amount)}</div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="px-2 py-2 rounded-xl border border-[--border] text-[--text-muted] hover:text-[--text-primary] transition"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-[--border] p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[--text-muted]">Investor:</span>{" "}
                            {c.profiles?.full_name ?? "N/A"} ({c.profiles?.email ?? "N/A"})
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Deal:</span>{" "}
                            {c.deals?.title ?? "Unknown"}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Amount:</span>{" "}
                            {formatCurrency(c.amount)}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Status:</span>{" "}
                            {c.status}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Committed:</span>{" "}
                            {new Date(c.commitment_date).toLocaleString()}
                          </div>
                          {c.funded_date && (
                            <div>
                              <span className="text-[--text-muted]">Funded:</span>{" "}
                              {new Date(c.funded_date).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {c.notes && (
                          <div>
                            <span className="text-[--text-muted]">Notes:</span>{" "}
                            {c.notes}
                          </div>
                        )}

                        {/* Action buttons */}
                        {c.status !== "cancelled" && c.status !== "completed" && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {c.status === "committed" && (
                              <button
                                onClick={() => doAction(c.id, "fund")}
                                disabled={acting === c.id}
                                className="px-3 py-2 rounded-xl border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 transition"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Fund
                              </button>
                            )}
                            {c.status === "funded" && (
                              <button
                                onClick={() => doAction(c.id, "complete")}
                                disabled={acting === c.id}
                                className="px-3 py-2 rounded-xl border border-teal-500/30 text-sm text-teal-400 hover:bg-teal-500/10 flex items-center gap-1.5 transition"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                Complete
                              </button>
                            )}
                            <button
                              onClick={() => doAction(c.id, "cancel")}
                              disabled={acting === c.id}
                              className="px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                            <button
                              onClick={() => doAction(c.id, "flag")}
                              disabled={acting === c.id}
                              className="px-3 py-2 rounded-xl border border-amber-500/30 text-sm text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 transition"
                            >
                              <Flag className="h-3.5 w-3.5" />
                              Flag
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Toast */}
        {toast && (
          <div
            className={[
              "fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50",
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white",
            ].join(" ")}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
