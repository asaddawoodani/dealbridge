"use client";

import { useEffect, useState, useMemo } from "react";
import {
  DollarSign,
  RefreshCw,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import PaymentStatusBadge from "./PaymentStatusBadge";

type EscrowRow = {
  id: string;
  commitment_id: string;
  amount: number;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number;
  created_at: string;
  commitment?: {
    id: string;
    amount: number;
    funding_status: string;
    deal_title: string;
    investor_name: string;
    investor_email: string;
  };
};

const STATUS_TABS = ["all", "pending", "succeeded", "failed", "refunded"] as const;

const PAYMENT_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  processing: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  succeeded: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  failed: "border-red-500/30 text-red-400 bg-red-500/10",
  refunded: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  partially_refunded: "border-orange-500/30 text-orange-400 bg-orange-500/10",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminEscrowPanel() {
  const [rows, setRows] = useState<EscrowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/escrow");
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setRows(json?.transactions ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusTab !== "all") {
      list = list.filter((r) => r.payment_status === statusTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.commitment?.deal_title?.toLowerCase().includes(q) ||
          r.commitment?.investor_name?.toLowerCase().includes(q) ||
          r.commitment?.investor_email?.toLowerCase().includes(q) ||
          r.stripe_payment_intent_id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, statusTab, search]);

  const stats = useMemo(() => {
    const succeeded = rows.filter((r) => r.payment_status === "succeeded");
    return {
      total: rows.length,
      totalFunded: succeeded.reduce((s, r) => s + r.amount, 0),
      succeededCount: succeeded.length,
      refundedCount: rows.filter((r) =>
        ["refunded", "partially_refunded"].includes(r.payment_status)
      ).length,
    };
  }, [rows]);

  const handleRefund = async (escrowId: string) => {
    setRefunding(escrowId);
    try {
      const res = await fetch("/api/stripe/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowTransactionId: escrowId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setToast({ type: "error", message: json?.error ?? "Refund failed" });
      } else {
        setToast({ type: "success", message: "Refund initiated" });
        await loadData();
      }
    } catch {
      setToast({ type: "error", message: "Network error" });
    }
    setRefunding(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Escrow Transactions</h2>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-sm text-[--text-muted] hover:text-[--text-primary] transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Transactions", value: stats.total },
          { label: "Total Funded", value: formatCurrency(stats.totalFunded) },
          { label: "Succeeded", value: stats.succeededCount },
          { label: "Refunded", value: stats.refundedCount },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[--border] bg-[--bg-input] p-4"
          >
            <div className="text-xs text-[--text-muted] mb-1">{s.label}</div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={[
                "px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
                statusTab === tab
                  ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                  : "border-[--border] text-[--text-secondary] hover:border-[--border-hover]",
              ].join(" ")}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--text-muted]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by deal, investor, or PI..."
            className="w-full rounded-xl bg-[--bg-input] border border-[--border] pl-9 pr-4 py-2 text-sm outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-[--text-secondary] py-8 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-[--text-muted] py-8 text-center">No transactions found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const isExpanded = expanded === row.id;
            return (
              <div
                key={row.id}
                className="rounded-xl border border-[--border] bg-[--bg-input] overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : row.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[--bg-elevated]/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DollarSign className="h-4 w-4 text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {row.commitment?.deal_title ?? "Unknown Deal"}
                      </div>
                      <div className="text-xs text-[--text-muted]">
                        {row.commitment?.investor_name ?? "Unknown"} &middot;{" "}
                        {formatCurrency(row.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={[
                        "text-xs px-2 py-1 rounded-full border font-medium",
                        PAYMENT_BADGE[row.payment_status] ?? PAYMENT_BADGE.pending,
                      ].join(" ")}
                    >
                      {row.payment_status}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-[--text-muted]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[--text-muted]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-[--border] space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-[--text-muted]">Investor</div>
                        <div>{row.commitment?.investor_name ?? "—"}</div>
                        <div className="text-xs text-[--text-muted]">
                          {row.commitment?.investor_email ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[--text-muted]">Amount</div>
                        <div className="font-semibold">{formatCurrency(row.amount)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[--text-muted]">Paid At</div>
                        <div>
                          {row.paid_at
                            ? new Date(row.paid_at).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[--text-muted]">Stripe PI</div>
                        <div className="text-xs font-mono break-all">
                          {row.stripe_payment_intent_id ?? "—"}
                        </div>
                      </div>
                      {row.refund_amount > 0 && (
                        <div>
                          <div className="text-xs text-[--text-muted]">Refunded</div>
                          <div>{formatCurrency(row.refund_amount)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-[--text-muted]">Funding Status</div>
                        <PaymentStatusBadge status={row.commitment?.funding_status ?? null} />
                      </div>
                    </div>

                    {row.payment_status === "succeeded" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleRefund(row.id)}
                          disabled={refunding === row.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition"
                        >
                          {refunding === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {refunding === row.id ? "Refunding..." : "Refund"}
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

      {/* Toast */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50",
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white",
          ].join(" ")}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
