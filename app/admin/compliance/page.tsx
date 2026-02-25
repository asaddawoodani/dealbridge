"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type KycSubmission = {
  id: string;
  user_id: string;
  full_legal_name: string;
  date_of_birth: string;
  nationality: string;
  tax_id_type: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  id_document_type: string;
  id_document_path: string;
  selfie_path: string | null;
  source_of_funds: string;
  source_details: string | null;
  expected_investment_range: string | null;
  pep_status: boolean;
  pep_details: string | null;
  status: string;
  risk_level: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    role: string;
  } | null;
};

type Toast = { type: "success" | "error"; message: string } | null;

const STATUS_TABS = ["all", "pending", "approved", "rejected", "expired"] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  approved: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  rejected: "border-red-500/30 text-red-400 bg-red-500/10",
  expired: "border-gray-500/30 text-gray-400 bg-gray-500/10",
};

export default function AdminCompliancePage() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, expired: 0 });
  const [q, setQ] = useState("");
  const [statusTab, setStatusTab] = useState<string>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadSubmissions = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/kyc");
    const json = await res.json().catch(() => null);
    setSubmissions(json?.submissions ?? []);
    if (json?.stats) setStats(json.stats);
    setLoading(false);
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return submissions.filter((v) => {
      if (statusTab !== "all" && v.status !== statusTab) return false;
      if (!s) return true;
      const blob = [
        v.full_legal_name,
        v.profiles?.email ?? "",
        v.profiles?.full_name ?? "",
        v.nationality,
        v.status,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [submissions, q, statusTab]);

  const approveSubmission = async (sub: KycSubmission) => {
    const res = await fetch(`/api/admin/kyc/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", risk_level: "low" }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Approve failed." });
      return;
    }

    setToast({ type: "success", message: "KYC approved." });
    await loadSubmissions();
  };

  const rejectSubmission = async (sub: KycSubmission) => {
    const reason = prompt("Rejection reason (optional):");
    if (reason === null) return;

    const res = await fetch(`/api/admin/kyc/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejection_reason: reason || null }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Reject failed." });
      return;
    }

    setToast({ type: "success", message: "KYC rejected." });
    await loadSubmissions();
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-[--text-secondary] mt-2">
            Review and manage KYC verification submissions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-400" },
            { label: "Approved", value: stats.approved, icon: ShieldCheck, color: "text-emerald-400" },
            { label: "Rejected", value: stats.rejected, icon: ShieldX, color: "text-red-400" },
            { label: "Expired", value: stats.expired, icon: ShieldAlert, color: "text-gray-400" },
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
                {tab === "pending" && stats.pending > 0
                  ? ` (${stats.pending})`
                  : ""}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-lg font-semibold">
              Submissions{" "}
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
            <div className="text-[--text-muted]">No KYC submissions found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((sub) => {
                const isExpanded = expandedId === sub.id;
                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-[--border] bg-[--bg-input] overflow-hidden"
                  >
                    {/* Summary row */}
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate">
                            {sub.full_legal_name}
                          </div>
                          <span
                            className={[
                              "text-xs px-2 py-1 rounded-full border",
                              STATUS_BADGE[sub.status] ?? "border-[--border] text-[--text-muted]",
                            ].join(" ")}
                          >
                            {sub.status}
                          </span>
                          {sub.risk_level && (
                            <span className="text-xs px-2 py-1 rounded-full border border-[--border] text-[--text-muted]">
                              Risk: {sub.risk_level}
                            </span>
                          )}
                          {sub.pep_status && (
                            <span className="text-xs px-2 py-1 rounded-full border border-red-500/30 text-red-400 bg-red-500/10">
                              PEP
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-[--text-muted] mt-1">
                          {sub.profiles?.email ?? "---"} &middot; {sub.nationality} &middot; {sub.source_of_funds}
                        </div>

                        {sub.rejection_reason && (
                          <div className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Rejection: {sub.rejection_reason}
                          </div>
                        )}

                        <div className="text-xs text-[--text-muted] mt-2">
                          {new Date(sub.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sub.status === "pending" && (
                          <>
                            <button
                              onClick={() => approveSubmission(sub)}
                              className="px-3 py-2 rounded-xl border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectSubmission(sub)}
                              className="px-3 py-2 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
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
                            <span className="text-[--text-muted]">Date of Birth:</span>{" "}
                            {sub.date_of_birth}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Nationality:</span>{" "}
                            {sub.nationality}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Tax ID Type:</span>{" "}
                            {sub.tax_id_type ?? "Not provided"}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">ID Document:</span>{" "}
                            {sub.id_document_type.replace("_", " ")}
                          </div>
                        </div>

                        <div>
                          <span className="text-[--text-muted]">Address:</span>{" "}
                          {[sub.address_line1, sub.address_line2, sub.city, sub.state_province, sub.postal_code, sub.country].filter(Boolean).join(", ")}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[--text-muted]">Source of Funds:</span>{" "}
                            {sub.source_of_funds}
                          </div>
                          <div>
                            <span className="text-[--text-muted]">Expected Range:</span>{" "}
                            {sub.expected_investment_range ?? "Not specified"}
                          </div>
                        </div>

                        {sub.source_details && (
                          <div>
                            <span className="text-[--text-muted]">Fund Details:</span>{" "}
                            {sub.source_details}
                          </div>
                        )}

                        {sub.pep_status && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                            <div className="font-medium text-red-400 mb-1">Politically Exposed Person</div>
                            <div className="text-[--text-secondary]">{sub.pep_details ?? "No details provided"}</div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-[--text-muted]">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            ID: {sub.id_document_path.split("/").pop()}
                          </div>
                          {sub.selfie_path && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              Selfie: {sub.selfie_path.split("/").pop()}
                            </div>
                          )}
                        </div>

                        {sub.expires_at && (
                          <div className="text-xs text-[--text-muted]">
                            Expires: {new Date(sub.expires_at).toLocaleDateString()}
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
