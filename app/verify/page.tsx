"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

type Toast = { type: "success" | "error"; message: string } | null;

const ACCREDITATION_TYPES = [
  { value: "income", label: "Income ($200k+ individual / $300k+ joint)" },
  { value: "net-worth", label: "Net Worth ($1M+ excluding primary residence)" },
  { value: "professional", label: "Licensed Professional (Series 7, 65, 82)" },
  { value: "entity", label: "Entity with $5M+ in assets" },
  { value: "knowledgeable-employee", label: "Knowledgeable Employee of Fund" },
];

export default function InvestorVerifyPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [form, setForm] = useState({
    full_legal_name: "",
    phone: "",
    accreditation_type: "income",
    proof_description: "",
    self_certified: false,
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
        router.push("/deals");
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
    if (!form.phone.trim()) {
      setToast({ type: "error", message: "Phone number is required." });
      return;
    }
    if (!form.self_certified) {
      setToast({ type: "error", message: "Self-certification is required." });
      return;
    }

    setSaving(true);
    setToast(null);

    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "investor",
        full_legal_name: form.full_legal_name.trim(),
        phone: form.phone.trim(),
        accreditation_type: form.accreditation_type,
        proof_description: form.proof_description.trim() || null,
        self_certified: form.self_certified,
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
            href="/deals"
            className="text-[--text-muted] hover:text-[--text-primary] flex items-center gap-1.5 text-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </a>
          <h1 className="text-3xl font-bold mt-4">Verify Your Account</h1>
          <p className="text-[--text-secondary] mt-2">
            Complete accredited investor verification to request deal introductions.
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
              placeholder="As it appears on legal documents"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Phone Number *</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Accreditation Type *</label>
            <select
              value={form.accreditation_type}
              onChange={(e) => setForm((p) => ({ ...p, accreditation_type: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
            >
              {ACCREDITATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Proof / Supporting Details (optional)</label>
            <textarea
              value={form.proof_description}
              onChange={(e) => setForm((p) => ({ ...p, proof_description: e.target.value }))}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              rows={3}
              placeholder="Describe any documentation you can provide..."
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3">
            <input
              type="checkbox"
              checked={form.self_certified}
              onChange={(e) => setForm((p) => ({ ...p, self_certified: e.target.checked }))}
              className="mt-1 h-4 w-4 accent-teal-500"
            />
            <div className="text-sm text-[--text-secondary]">
              <div className="font-medium text-[--text-primary]">
                I certify that I am an accredited investor
              </div>
              <div className="text-xs text-[--text-muted] mt-0.5">
                By checking this box, I certify under penalty of law that I meet the qualifications of an accredited investor as defined by the SEC.
              </div>
            </div>
          </label>

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
