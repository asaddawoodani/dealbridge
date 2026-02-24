"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, X } from "lucide-react";

type Toast = { type: "success" | "error"; message: string } | null;

const CATEGORIES = [
  { value: "small-business", label: "Small Business" },
  { value: "real-estate", label: "Real Estate" },
  { value: "energy-infra", label: "Energy / Infrastructure" },
  { value: "funds", label: "Funds" },
  { value: "tech-startups", label: "Tech / Startups" },
  { value: "services", label: "Services (B2B)" },
];

export default function EditDealPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

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

      const res = await fetch(`/api/deals/${id}`);
      const json = await res.json().catch(() => null);
      const deal = json?.deal;

      if (!deal || deal.operator_id !== user.id || deal.status !== "pending") {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setForm({
        title: deal.title ?? "",
        category: deal.category ?? "small-business",
        description: deal.description ?? "",
        location: deal.location ?? "",
        min_check: deal.min_check ?? "",
        timeline: deal.timeline ?? "",
      });
      setTags(deal.tags ?? []);
      setLoading(false);
    })();
  }, [id, router]);

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

    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
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
      setToast({ type: "error", message: json?.error ?? "Update failed." });
      return;
    }

    router.push("/operator/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[--text-muted]">Loading...</div>
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Cannot edit this deal</h1>
          <p className="text-[--text-secondary] mb-6">
            Only pending deals you own can be edited.
          </p>
          <a
            href="/operator/dashboard"
            className="rounded-xl bg-teal-500 text-white px-5 py-3 font-semibold hover:bg-teal-600 transition-all text-sm"
          >
            Back to dashboard
          </a>
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
          <h1 className="text-3xl font-bold mt-4">Edit Deal</h1>
          <p className="text-[--text-secondary] mt-2">
            Update your deal details. It will remain pending until approved.
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
              {saving ? "Saving..." : "Save Changes"}
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
