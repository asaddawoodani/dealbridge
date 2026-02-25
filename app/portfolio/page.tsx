"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  DollarSign,
  Search,
} from "lucide-react";

type Commitment = {
  id: string;
  deal_id: string;
  amount: number;
  status: string;
  commitment_date: string;
  funded_date: string | null;
  notes: string | null;
  deals: {
    id: string;
    title: string;
    category: string | null;
    min_check: string | null;
    target_raise: number | null;
    total_committed: number;
  } | null;
};

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

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [statusTab, setStatusTab] = useState<string>("all");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadCommitments = async () => {
    setLoading(true);
    const res = await fetch("/api/commitments");
    const json = await res.json().catch(() => null);
    setCommitments(json?.commitments ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadCommitments();
  }, []);

  const stats = useMemo(() => {
    const active = commitments.filter((c) => c.status !== "cancelled");
    return {
      totalInvested: active.reduce((sum, c) => sum + c.amount, 0),
      activeCount: commitments.filter((c) => c.status === "committed").length,
      fundedCount: commitments.filter((c) => c.status === "funded").length,
      completedCount: commitments.filter((c) => c.status === "completed").length,
    };
  }, [commitments]);

  const filtered = useMemo(() => {
    if (statusTab === "all") return commitments;
    return commitments.filter((c) => c.status === statusTab);
  }, [commitments, statusTab]);

  const cancelCommitment = async (id: string) => {
    setCancelling(id);
    const res = await fetch(`/api/commitments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const json = await res.json().catch(() => null);
    setCancelling(null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Cancel failed" });
      return;
    }

    setToast({ type: "success", message: "Commitment cancelled" });
    await loadCommitments();
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Portfolio</h1>
          <p className="text-[--text-secondary] mt-2">
            Track your investment commitments across all deals.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Invested", value: formatCurrency(stats.totalInvested), icon: DollarSign, color: "text-teal-400" },
            { label: "Active", value: stats.activeCount, icon: TrendingUp, color: "text-blue-400" },
            { label: "Funded", value: stats.fundedCount, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Completed", value: stats.completedCount, icon: Wallet, color: "text-purple-400" },
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
              </button>
            ))}
          </div>

          <div className="text-lg font-semibold mb-4">
            Commitments{" "}
            <span className="text-[--text-muted] text-sm">({filtered.length})</span>
          </div>

          {loading ? (
            <div className="text-[--text-secondary]">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <div className="text-lg font-semibold mb-2">No investments yet</div>
              <p className="text-[--text-secondary] mb-6">Browse deals and make your first commitment.</p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 text-white px-5 py-3 font-semibold hover:bg-teal-600 transition-all text-sm"
              >
                Browse Deals
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-[--border] bg-[--bg-input] p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/deals/${c.deal_id}`}
                        className="font-semibold truncate hover:text-teal-400 transition"
                      >
                        {c.deals?.title ?? "Unknown Deal"}
                      </Link>
                      <span
                        className={[
                          "text-xs px-2 py-1 rounded-full border",
                          STATUS_BADGE[c.status] ?? "border-[--border] text-[--text-muted]",
                        ].join(" ")}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="text-sm text-[--text-muted] mt-1">
                      {c.deals?.category?.replaceAll("-", " ") ?? "---"} / {formatCurrency(c.amount)}
                    </div>

                    {c.notes && (
                      <div className="text-sm text-[--text-secondary] mt-2 line-clamp-2">
                        {c.notes}
                      </div>
                    )}

                    <div className="text-xs text-[--text-muted] mt-2">
                      Committed: {new Date(c.commitment_date).toLocaleDateString()}
                      {c.funded_date && (
                        <> &middot; Funded: {new Date(c.funded_date).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="text-lg font-bold text-right">{formatCurrency(c.amount)}</div>
                    {c.status === "committed" && (
                      <button
                        onClick={() => cancelCommitment(c.id)}
                        disabled={cancelling === c.id}
                        className="px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {cancelling === c.id ? "..." : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
