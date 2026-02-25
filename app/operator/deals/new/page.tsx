"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, X, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Toast = { type: "success" | "error"; message: string } | null;

const CATEGORIES = [
  { value: "small-business", label: "Small Business" },
  { value: "real-estate", label: "Real Estate" },
  { value: "energy-infra", label: "Energy / Infrastructure" },
  { value: "funds", label: "Funds" },
  { value: "tech-startups", label: "Tech / Startups" },
  { value: "services", label: "Services (B2B)" },
];

export default function NewDealPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();
      setVerificationStatus(profile?.verification_status ?? "unverified");
      setCheckingVerification(false);
    })();
  }, [router]);

  const [form, setForm] = useState({
    title: "",
    category: "small-business",
    description: "",
    location: "",
    min_check: "",
    timeline: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const submit = async () => {
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
        timeline: form.timeline.trim() || null,
        tags: tags.length > 0 ? tags : null,
      }),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setToast({ type: "error", message: json?.error ?? "Submission failed." });
      return;
    }

    router.push("/operator/dashboard");
  };

  if (checkingVerification) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl text-[--text-secondary]">Loading...</div>
      </div>
    );
  }

  if (verificationStatus !== "verified") {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-amber-400 mx-auto" />
            <h1 className="text-2xl font-bold">Verification Required</h1>
            <p className="text-[--text-secondary]">
              {verificationStatus === "pending"
                ? "Your verification is being reviewed. You'll be able to submit deals once approved."
                : verificationStatus === "rejected"
                ? "Your verification was not approved. Please resubmit to start submitting deals."
                : "You need to verify your business before submitting deals on the platform."}
            </p>
            {verificationStatus !== "pending" && (
              <Link
                href="/operator/verify"
                className="inline-block rounded-xl bg-amber-500 text-white px-5 py-3 font-semibold hover:bg-amber-600 transition-all text-sm"
              >
                {verificationStatus === "rejected" ? "Resubmit Verification" : "Verify Business"}
              </Link>
            )}
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
          <h1 className="text-3xl font-bold mt-4">Submit a Deal</h1>
          <p className="text-[--text-secondary] mt-2">
            Your deal will be reviewed by our team before going live.
          </p>
        </div>

        {/* Form */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-[--text-secondary]">Title *</label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="e.g., Dani's Market — New Store Buildout"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              rows={5}
              placeholder="Tell investors about your business, the opportunity, and what you're looking for..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[--text-secondary]">Location</label>
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder='e.g., "Rensselaer, NY"'
              />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Investment Size</label>
              <input
                value={form.min_check}
                onChange={(e) =>
                  setForm((p) => ({ ...p, min_check: e.target.value }))
                }
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder='e.g., "50k", "100k-500k"'
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Timeline</label>
            <input
              value={form.timeline}
              onChange={(e) =>
                setForm((p) => ({ ...p, timeline: e.target.value }))
              }
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder='e.g., "Immediate", "30-90 days", "Flexible"'
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Tags</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm text-teal-400"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-teal-400/60 hover:text-teal-400 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
                placeholder="Type a tag and press Enter"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-xl border border-[--border] px-4 py-3 text-sm hover:border-[--border-hover] flex items-center gap-1 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className={[
                "rounded-xl px-6 py-3 font-semibold transition-all",
                saving
                  ? "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
                  : "bg-teal-500 text-white hover:bg-teal-600",
              ].join(" ")}
            >
              {saving ? "Submitting..." : "Submit for Review"}
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
