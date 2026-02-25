"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  BarChart3,
  Clock,
  AlertTriangle,
} from "lucide-react";

type Deal = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: string | null;
  min_check: string | null;
  location: string | null;
  status: string | null;
  operator_id: string | null;
};

type Toast = { type: "success" | "error"; message: string } | null;

const STATUS_TABS = ["all", "pending", "active", "inactive"] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  active: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  inactive: "border-[--border] text-[--text-muted]",
};

export default function AdminDealsPage() {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [q, setQ] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [toast, setToast] = useState<Toast>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "real-estate",
    min_check: "",
    location: "",
    target_raise: "",
    status: "active",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadDeals = async () => {
    setLoading(true);
    const res = await fetch("/api/deals?status=all");
    const json = await res.json().catch(() => null);
    setDeals(json?.deals ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const pendingCount = useMemo(
    () => deals.filter((d) => d.status === "pending").length,
    [deals]
  );

  const activeCount = useMemo(
    () => deals.filter((d) => d.status === "active").length,
    [deals]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return deals.filter((d) => {
      if (statusTab !== "all" && d.status !== statusTab) return false;
      if (!s) return true;
      const blob = [
        d.title,
        d.description ?? "",
        d.category ?? "",
        d.location ?? "",
        d.min_check ?? "",
        d.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [deals, q, statusTab]);

  const createDeal = async () => {
    if (!form.title.trim()) {
      setToast({ type: "error", message: "Title is required." });
      return;
    }

    setSaving(true);
    setToast(null);

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        min_check: form.min_check.trim() || null,
        location: form.location.trim() || null,
        target_raise: parseFloat(form.target_raise) || null,
        status: form.status,
      }),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Create failed." });
      return;
    }

    setToast({ type: "success", message: "Deal created" });
    setForm((p) => ({
      ...p,
      title: "",
      description: "",
      min_check: "",
      location: "",
      target_raise: "",
      status: "active",
    }));
    await loadDeals();
  };

  const approveDeal = async (deal: Deal) => {
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Approve failed." });
      return;
    }

    setToast({
      type: "success",
      message: `"${deal.title}" approved and now active.`,
    });
    await loadDeals();
  };

  const rejectDeal = async (deal: Deal) => {
    const ok = confirm(`Reject "${deal.title}"? This will set it to inactive.`);
    if (!ok) return;

    const res = await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Reject failed." });
      return;
    }

    setToast({ type: "success", message: `"${deal.title}" rejected.` });
    await loadDeals();
  };

  const toggleStatus = async (deal: Deal) => {
    const next = deal.status === "active" ? "inactive" : "active";

    const res = await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Update failed." });
      return;
    }

    setToast({ type: "success", message: `Set to ${next}` });
    await loadDeals();
  };

  const deleteDeal = async (deal: Deal) => {
    const ok = confirm(`Delete "${deal.title}"? This cannot be undone.`);
    if (!ok) return;

    const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Delete failed." });
      return;
    }

    setToast({ type: "success", message: "Deleted" });
    await loadDeals();
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Deals</h1>
            <p className="text-[--text-secondary] mt-2">
              Create, approve, activate/deactivate, and delete deals.
            </p>

            <div className="flex items-center gap-4 mt-3">
              <Link
                href="/deals"
                className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4 text-sm transition"
              >
                Public Deals
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Deals", value: deals.length, icon: BarChart3, color: "text-teal-400" },
            { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-amber-400" },
            { label: "Active", value: activeCount, icon: CheckCircle2, color: "text-emerald-400" },
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

        {/* Create */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4 mb-8">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5 text-teal-400" />
            Create new deal
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm text-[--text-secondary]">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder="e.g., Dani's Market Expansion — New Store Buildout"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-[--text-secondary]">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                rows={3}
                placeholder="Quick summary..."
              />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
              >
                <option value="real-estate">Real Estate</option>
                <option value="small-business">Small Business</option>
                <option value="energy-infra">Energy / Infra</option>
                <option value="funds">Funds</option>
                <option value="tech-startups">Tech / Startups</option>
                <option value="services">Services</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Min check</label>
              <input
                value={form.min_check}
                onChange={(e) => setForm((p) => ({ ...p, min_check: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder='e.g., "50k"'
              />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder='e.g., "Rensselaer, NY"'
              />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Target Raise ($)</label>
              <input
                value={form.target_raise}
                onChange={(e) => setForm((p) => ({ ...p, target_raise: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder='e.g., "500000"'
              />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={createDeal}
              disabled={saving}
              className={[
                "rounded-xl px-6 py-3 font-semibold transition-all",
                saving
                  ? "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
                  : "bg-teal-500 text-white hover:bg-teal-600",
              ].join(" ")}
            >
              {saving ? "Creating..." : "Create Deal"}
            </button>
          </div>
        </section>

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
                {tab === "pending" && pendingCount > 0
                  ? ` (${pendingCount})`
                  : ""}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-lg font-semibold">
              Deals{" "}
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
            <div className="text-[--text-muted]">No deals found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-[--border] bg-[--bg-input] p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">{d.title}</div>
                      <span
                        className={[
                          "text-xs px-2 py-1 rounded-full border",
                          STATUS_BADGE[d.status ?? ""] ??
                            "border-[--border] text-[--text-muted]",
                        ].join(" ")}
                      >
                        {d.status ?? "---"}
                      </span>
                      {d.operator_id && (
                        <span className="text-xs px-2 py-1 rounded-full border border-purple-500/30 text-purple-400 bg-purple-500/10">
                          Operator
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-[--text-muted] mt-1">
                      {d.category ?? "---"} / {d.location ?? "---"} /{" "}
                      {d.min_check ?? "---"}
                    </div>

                    {d.description && (
                      <div className="text-sm text-[--text-secondary] mt-2 line-clamp-2">
                        {d.description}
                      </div>
                    )}

                    <div className="text-xs text-[--text-muted] mt-2">
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Link
                      href={`/deals/${d.id}`}
                      className="px-3 py-2 rounded-xl border border-[--border] text-sm hover:border-[--border-hover] text-center flex items-center gap-1.5 transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>

                    {d.status === "pending" && (
                      <>
                        <button
                          onClick={() => approveDeal(d)}
                          className="px-3 py-2 rounded-xl border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectDeal(d)}
                          className="px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {d.status !== "pending" && (
                      <button
                        onClick={() => toggleStatus(d)}
                        className="px-3 py-2 rounded-xl border border-[--border] text-sm hover:border-[--border-hover] flex items-center gap-1.5 transition"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {d.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    )}

                    <button
                      onClick={() => deleteDeal(d)}
                      className="px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
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
