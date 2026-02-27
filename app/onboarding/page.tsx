"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Plus, X } from "lucide-react";
import { TAXONOMY, type CategoryKey } from "@/lib/taxonomy";

export default function OnboardingPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [selectedSubcats, setSelectedSubcats] = useState<Record<string, boolean>>({});
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [checkSize, setCheckSize] = useState("50-100k");
  const [timeline, setTimeline] = useState("30-90_days");
  const [involvement, setInvolvement] = useState("passive");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedSubcategoryKeys = useMemo(
    () => Object.entries(selectedSubcats).filter(([, v]) => v).map(([k]) => k),
    [selectedSubcats]
  );

  // Load user and existing profile
  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      setUserId(user.id);

      // Load existing profile for this user
      const { data } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingProfileId(data.id);
        setSelectedCategories((data.categories ?? []) as CategoryKey[]);

        const subcatKeys: string[] = data.subcategories ?? [];
        const map: Record<string, boolean> = {};
        for (const k of subcatKeys) map[k] = true;
        setSelectedSubcats(map);

        setTags((data.tags ?? []) as string[]);
        setCheckSize(data.check_size ?? "50-100k");
        setTimeline(data.timeline ?? "30-90_days");
        setInvolvement(data.involvement ?? "passive");
        setVerifiedOnly(Boolean(data.verified_only));
      }

      setLoadingProfile(false);
    };

    load();
  }, [supabase]);

  const toggleCategory = (key: CategoryKey) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const toggleSubcat = (key: string) => {
    setSelectedSubcats((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addTag = () => {
    const cleaned = tagInput.trim();
    if (!cleaned) return;
    const next = cleaned.toLowerCase();
    if (tags.includes(next)) {
      setTagInput("");
      return;
    }
    setTags((t) => [...t, next]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const canContinue = selectedSubcategoryKeys.length > 0;

  const handleSubmit = async () => {
    if (!userId) return;

    setSaving(true);
    const payload = {
      categories: selectedCategories,
      subcategories: selectedSubcategoryKeys,
      tags,
      check_size: checkSize,
      timeline,
      involvement,
      verified_only: verifiedOnly,
      user_id: userId,
    };

    const isEditing = !!existingProfileId;

    const { error } = isEditing
      ? await supabase
          .from("investor_profiles")
          .update(payload)
          .eq("id", existingProfileId!)
      : await supabase
          .from("investor_profiles")
          .insert(payload);

    if (error) {
      setToast({ type: "error", message: error.message });
      setSaving(false);
      return;
    }

    setToast({ type: "success", message: isEditing ? "Updated!" : "Saved!" });
    setSaving(false);
    window.location.href = "/dashboard";
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[--text-muted]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Investor Onboarding</h1>
          <p className="text-[--text-secondary] mt-2">
            Tell DealBridge what you&apos;re interested in so we can match you with the right deals.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            selectedCategories.length > 0
              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
              : "bg-[--bg-elevated] text-[--text-muted] border border-[--border]"
          }`}>
            {selectedCategories.length > 0 ? <Check className="h-3 w-3" /> : "1"}
            <span>Categories</span>
          </div>
          <div className="h-px w-6 bg-[--border]" />
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            selectedSubcategoryKeys.length > 0
              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
              : "bg-[--bg-elevated] text-[--text-muted] border border-[--border]"
          }`}>
            {selectedSubcategoryKeys.length > 0 ? <Check className="h-3 w-3" /> : "2"}
            <span>Details</span>
          </div>
          <div className="h-px w-6 bg-[--border]" />
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-[--bg-elevated] text-[--text-muted] border border-[--border]">
            3
            <span>Preferences</span>
          </div>
        </div>

        {/* Categories */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">What are you interested in?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(TAXONOMY) as CategoryKey[]).map((key) => {
              const selected = selectedCategories.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className={[
                    "text-left px-4 py-3.5 rounded-xl border transition-all",
                    selected
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                      : "bg-[--bg-input] border-[--border] hover:border-[--border-hover] text-[--text-primary]",
                  ].join(" ")}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {selected && <Check className="h-4 w-4" />}
                    {TAXONOMY[key].label}
                  </div>
                  <div className={`text-sm mt-0.5 ${selected ? "text-teal-400/70" : "text-[--text-muted]"}`}>
                    Choose subcategories next
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Subcategories */}
        {selectedCategories.length > 0 && (
          <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Get specific</h2>
            <p className="text-[--text-secondary] mb-4">
              Select at least one subcategory. This is what makes matching feel &quot;smart.&quot;
            </p>

            <div className="space-y-5">
              {selectedCategories.map((catKey) => (
                <div key={catKey} className="border border-[--border] rounded-2xl p-4 bg-[--bg-input]">
                  <div className="font-semibold mb-3 text-teal-400">{TAXONOMY[catKey].label}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TAXONOMY[catKey].subcategories.map((s) => {
                      const checked = !!selectedSubcats[s.key];
                      return (
                        <label
                          key={s.key}
                          className={[
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all",
                            checked
                              ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                              : "border-[--border] hover:border-[--border-hover] text-[--text-secondary]",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-teal-500"
                            checked={checked}
                            onChange={() => toggleSubcat(s.key)}
                          />
                          <span className="text-sm">{s.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Any specifics? (optional)</h2>
          <p className="text-[--text-secondary] mb-4">
            Add keywords like <span className="text-[--text-primary] font-medium">&quot;coffee&quot;</span>,{" "}
            <span className="text-[--text-primary] font-medium">&quot;gas station&quot;</span>,{" "}
            <span className="text-[--text-primary] font-medium">&quot;self-storage&quot;</span>.
          </p>

          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type a tag and press Enter"
              className="flex-1 rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-xl bg-teal-500 text-white px-4 py-3 font-semibold hover:bg-teal-600 transition-all flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => removeTag(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 hover:bg-amber-500/20 transition-all"
                  title="Click to remove"
                >
                  {t}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Preferences */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[--text-secondary]">Typical check size</label>
              <select
                value={checkSize}
                onChange={(e) => setCheckSize(e.target.value)}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
              >
                <option value="<25k">&lt;$25k</option>
                <option value="25-50k">$25k-$50k</option>
                <option value="50-100k">$50k-$100k</option>
                <option value="100-250k">$100k-$250k</option>
                <option value="250-500k">$250k-$500k</option>
                <option value="500k+">$500k+</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Timeline</label>
              <select
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
              >
                <option value="ready_now">Ready now</option>
                <option value="30-90_days">30-90 days</option>
                <option value="3-12_months">3-12 months</option>
                <option value="exploring">Exploring</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Involvement</label>
              <select
                value={involvement}
                onChange={(e) => setInvolvement(e.target.value)}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
              >
                <option value="passive">Passive</option>
                <option value="advisory">Advisory</option>
                <option value="active">Active</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-4 w-4 accent-teal-500"
                />
                <span className="text-sm text-[--text-secondary]">Only show verified issuers</span>
              </label>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4">
          <a
            href="/dashboard"
            className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4"
          >
            Back
          </a>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canContinue || saving}
            className={[
              "rounded-xl px-6 py-3 font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed",
              canContinue
                ? "bg-teal-500 text-white hover:bg-teal-600"
                : "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed",
            ].join(" ")}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>

        {!canContinue && (
          <p className="text-sm text-[--text-muted] mt-3 text-right">
            Select at least one subcategory to continue.
          </p>
        )}
      </div>
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
