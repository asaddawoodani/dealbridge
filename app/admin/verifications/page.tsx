"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  BarChart3,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

type Verification = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  full_legal_name: string | null;
  phone: string | null;
  accreditation_type: string | null;
  proof_description: string | null;
  self_certified: boolean;
  business_name: string | null;
  business_type: string | null;
  ein_registration: string | null;
  business_address: string | null;
  business_description: string | null;
  years_in_operation: string | null;
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
    role: string;
  } | null;
};

type Toast = { type: "success" | "error"; message: string } | null;

const STATUS_TABS = ["all", "pending", "approved", "rejected"] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  approved: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  rejected: "border-red-500/30 text-red-400 bg-red-500/10",
};

export default function AdminVerificationsPage() {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [q, setQ] = useState("");
  const [statusTab, setStatusTab] = useState<string>("pending");
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadVerifications = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/verifications?status=all");
    const json = await res.json().catch(() => null);
    setVerifications(json?.verifications ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const pendingCount = useMemo(
    () => verifications.filter((v) => v.status === "pending").length,
    [verifications]
  );

  const approvedCount = useMemo(
    () => verifications.filter((v) => v.status === "approved").length,
    [verifications]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return verifications.filter((v) => {
      if (statusTab !== "all" && v.status !== statusTab) return false;
      if (!s) return true;
      const blob = [
        v.full_legal_name ?? "",
        v.business_name ?? "",
        v.profiles?.email ?? "",
        v.profiles?.full_name ?? "",
        v.role,
        v.status,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [verifications, q, statusTab]);

  const approveVerification = async (v: Verification) => {
    const res = await fetch(`/api/admin/verifications/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Approve failed." });
      return;
    }

    setToast({ type: "success", message: "Verification approved." });
    await loadVerifications();
  };

  const rejectVerification = async (v: Verification) => {
    const reason = prompt("Rejection reason (optional):");
    if (reason === null) return; // user cancelled

    const res = await fetch(`/api/admin/verifications/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejection_reason: reason || null }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Reject failed." });
      return;
    }

    setToast({ type: "success", message: "Verification rejected." });
    await loadVerifications();
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Verifications</h1>
          <p className="text-[--text-secondary] mt-2">
            Review and manage investor and operator verification requests.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Requests", value: verifications.length, icon: BarChart3, color: "text-teal-400" },
            { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-amber-400" },
            { label: "Approved", value: approvedCount, icon: ShieldCheck, color: "text-emerald-400" },
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
                {tab === "pending" && pendingCount > 0
                  ? ` (${pendingCount})`
                  : ""}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-lg font-semibold">
              Requests{" "}
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
            <div className="text-[--text-muted]">No verification requests found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-[--border] bg-[--bg-input] p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">
                        {v.full_legal_name ?? v.profiles?.full_name ?? "Unknown"}
                      </div>
                      <span
                        className={[
                          "text-xs px-2 py-1 rounded-full border",
                          STATUS_BADGE[v.status] ?? "border-[--border] text-[--text-muted]",
                        ].join(" ")}
                      >
                        {v.status}
                      </span>
                      <span
                        className={[
                          "text-xs px-2 py-1 rounded-full border",
                          v.role === "investor"
                            ? "border-teal-500/30 text-teal-400 bg-teal-500/10"
                            : "border-purple-500/30 text-purple-400 bg-purple-500/10",
                        ].join(" ")}
                      >
                        {v.role}
                      </span>
                    </div>

                    <div className="text-sm text-[--text-muted] mt-1">
                      {v.profiles?.email ?? "---"}
                    </div>

                    {/* Submitted fields */}
                    <div className="mt-3 space-y-1 text-sm text-[--text-secondary]">
                      {v.role === "investor" && (
                        <>
                          {v.phone && <div><span className="text-[--text-muted]">Phone:</span> {v.phone}</div>}
                          {v.accreditation_type && <div><span className="text-[--text-muted]">Accreditation:</span> {v.accreditation_type}</div>}
                          {v.proof_description && <div><span className="text-[--text-muted]">Proof:</span> {v.proof_description}</div>}
                          <div><span className="text-[--text-muted]">Self-certified:</span> {v.self_certified ? "Yes" : "No"}</div>
                        </>
                      )}
                      {v.role === "operator" && (
                        <>
                          {v.business_name && <div><span className="text-[--text-muted]">Business:</span> {v.business_name}</div>}
                          {v.business_type && <div><span className="text-[--text-muted]">Type:</span> {v.business_type}</div>}
                          {v.ein_registration && <div><span className="text-[--text-muted]">EIN:</span> {v.ein_registration}</div>}
                          {v.business_address && <div><span className="text-[--text-muted]">Address:</span> {v.business_address}</div>}
                          {v.business_description && <div className="line-clamp-2"><span className="text-[--text-muted]">Description:</span> {v.business_description}</div>}
                          {v.years_in_operation && <div><span className="text-[--text-muted]">Years:</span> {v.years_in_operation}</div>}
                        </>
                      )}
                    </div>

                    {v.rejection_reason && (
                      <div className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Rejection reason: {v.rejection_reason}
                      </div>
                    )}

                    <div className="text-xs text-[--text-muted] mt-2">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                  </div>

                  {v.status === "pending" && (
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <button
                        onClick={() => approveVerification(v)}
                        className="px-3 py-2 rounded-xl border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectVerification(v)}
                        className="px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Toast */}
        {toast && (
          <div
            className={[
              "fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50",
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
