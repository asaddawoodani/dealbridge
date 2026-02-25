"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

type Toast = { type: "success" | "error"; message: string } | null;

const BUSINESS_TYPES = [
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "sole-proprietorship", label: "Sole Proprietorship" },
  { value: "other", label: "Other" },
];

export default function OperatorVerifyPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [form, setForm] = useState({
    full_legal_name: "",
    business_name: "",
    business_type: "llc",
    ein_registration: "",
    business_address: "",
    business_description: "",
    years_in_operation: "",
  });

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

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();

      const status = profile?.verification_status ?? "unverified";
      setVerificationStatus(status);

      if (status === "verified") {
        router.push("/operator/dashboard");
        return;
      }

      setLoading(false);
    })();
  }, [router]);

  const submit = async () => {
    if (!form.full_legal_name.trim()) {
      setToast({ type: "error", message: "Full legal name is required." });
      return;
    }
    if (!form.business_name.trim()) {
      setToast({ type: "error", message: "Business name is required." });
      return;
    }
    if (!form.business_description.trim()) {
      setToast({ type: "error", message: "Business description is required." });
      return;
    }

    setSaving(true);
    setToast(null);

    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "operator",
        full_legal_name: form.full_legal_name.trim(),
        business_name: form.business_name.trim(),
        business_type: form.business_type,
        ein_registration: form.ein_registration.trim() || null,
        business_address: form.business_address.trim() || null,
        business_description: form.business_description.trim(),
        years_in_operation: form.years_in_operation.trim() || null,
      }),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Submission failed." });
      return;
    }

    setVerificationStatus("pending");
    setToast({ type: "success", message: "Verification submitted!" });
  };

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl text-[--text-secondary]">Loading...</div>
      </div>
    );
  }

  if (verificationStatus === "pending") {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
            <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verification Pending</h1>
            <p className="text-[--text-secondary]">
              Your verification request is being reviewed. We&apos;ll notify you by email once it&apos;s been processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/operator/dashboard"
            className="text-[--text-muted] hover:text-[--text-primary] flex items-center gap-1.5 text-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </a>
          <h1 className="text-3xl font-bold mt-4">Verify Your Business</h1>
          <p className="text-[--text-secondary] mt-2">
            Complete business verification to submit deals on the platform.
          </p>
        </div>

        {verificationStatus === "rejected" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 mb-6">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-1">
              <ShieldAlert className="h-4 w-4" />
              Previous Verification Rejected
            </div>
            <p className="text-sm text-[--text-secondary]">
              Your previous verification was not approved. Please resubmit with updated information.
            </p>
          </div>
        )}

        {/* Form */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-[--text-secondary]">Full Legal Name *</label>
            <input
              value={form.full_legal_name}
              onChange={(e) => setForm((p) => ({ ...p, full_legal_name: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="Your full legal name"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Business Name *</label>
            <input
              value={form.business_name}
              onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="Registered business name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[--text-secondary]">Business Type *</label>
              <select
                value={form.business_type}
                onChange={(e) => setForm((p) => ({ ...p, business_type: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">EIN / Registration #</label>
              <input
                value={form.ein_registration}
                onChange={(e) => setForm((p) => ({ ...p, ein_registration: e.target.value }))}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder="XX-XXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Business Address</label>
            <input
              value={form.business_address}
              onChange={(e) => setForm((p) => ({ ...p, business_address: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="Full business address"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Business Description *</label>
            <textarea
              value={form.business_description}
              onChange={(e) => setForm((p) => ({ ...p, business_description: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              rows={4}
              placeholder="Describe your business, operations, and the types of deals you plan to submit..."
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Years in Operation</label>
            <input
              value={form.years_in_operation}
              onChange={(e) => setForm((p) => ({ ...p, years_in_operation: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder='e.g., "3 years", "10+"'
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className={[
                "rounded-xl px-6 py-3 font-semibold transition-all flex items-center gap-2",
                saving
                  ? "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
                  : "bg-teal-500 text-white hover:bg-teal-600",
              ].join(" ")}
            >
              {saving ? (
                "Submitting..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Verification
                </>
              )}
            </button>
          </div>
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
