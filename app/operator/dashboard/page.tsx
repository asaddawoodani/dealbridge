"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus,
  BarChart3,
  Clock,
  CheckCircle2,
  Eye,
  Pencil,
  ShieldAlert,
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
};

type Toast = { type: "success" | "error"; message: string } | null;

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  active: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  inactive: "border-[--border] text-[--text-muted]",
};

export default function OperatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [userName, setUserName] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("unverified");
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, verification_status")
        .eq("id", user.id)
        .single();

      setUserName(profile?.full_name ?? "");
      setVerificationStatus(profile?.verification_status ?? "unverified");

      // Fetch operator's deals
      const res = await fetch(
        `/api/deals?status=all&operator_id=${user.id}`
      );
      const json = await res.json().catch(() => null);
      setDeals(json?.deals ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const pending = deals.filter((d) => d.status === "pending").length;
    const active = deals.filter((d) => d.status === "active").length;
    return { total: deals.length, pending, active };
  }, [deals]);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Deals</h1>
            {userName && (
              <p className="text-[--text-secondary] mt-1">Welcome back, {userName}</p>
            )}
          </div>

          {verificationStatus === "verified" ? (
            <Link
              href="/operator/deals/new"
              className="rounded-xl bg-teal-500 text-white px-5 py-3 font-semibold hover:bg-teal-600 transition-all text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Submit New Deal
            </Link>
          ) : (
            <Link
              href="/operator/verify"
              className="rounded-xl bg-amber-500 text-white px-5 py-3 font-semibold hover:bg-amber-600 transition-all text-sm flex items-center gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              {verificationStatus === "pending" ? "Verification Pending" : "Verify to Submit"}
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Deals", value: stats.total, icon: BarChart3, color: "text-teal-400" },
            { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-amber-400" },
            { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-400" },
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

        {/* Deal list */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
          <div className="text-lg font-semibold mb-4">
            Your deals{" "}
            <span className="text-[--text-muted] text-sm">({deals.length})</span>
          </div>

          {loading ? (
            <div className="text-[--text-secondary]">Loading...</div>
          ) : deals.length === 0 ? (
            <div className="text-[--text-secondary]">
              No deals yet.{" "}
              <Link
                href="/operator/deals/new"
                className="text-teal-400 underline underline-offset-4"
              >
                Submit your first deal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-[--border] bg-[--bg-input] p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
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
                      <Link
                        href={`/operator/deals/${d.id}/edit`}
                        className="px-3 py-2 rounded-xl border border-[--border] text-sm hover:border-[--border-hover] text-center flex items-center gap-1.5 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
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
