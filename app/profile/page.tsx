"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Check,
  Plus,
  X,
  Loader2,
  Eye,
  ShieldCheck,
  Calendar,
  Lock,
} from "lucide-react";
import {
  TAXONOMY,
  categoryLabel,
  subcategoryLabel,
  type CategoryKey,
} from "@/lib/taxonomy";

function formatCheckSize(val: string | null) {
  if (!val) return "N/A";
  const map: Record<string, string> = {
    "<25k": "<$25K",
    "25-50k": "$25K–$50K",
    "50-100k": "$50K–$100K",
    "100-250k": "$100K–$250K",
    "250-500k": "$250K–$500K",
    "500k+": "$500K+",
  };
  return map[val] ?? val;
}

function formatTimeline(val: string | null) {
  if (!val) return "N/A";
  const map: Record<string, string> = {
    ready_now: "Ready now",
    "30-90_days": "30–90 days",
    "3-12_months": "3–12 months",
    exploring: "Exploring",
  };
  return map[val] ?? val;
}

function formatInvolvement(val: string | null) {
  if (!val) return "N/A";
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export default function ProfileEditPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");

  // Investor preferences
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>(
    []
  );
  const [selectedSubcats, setSelectedSubcats] = useState<
    Record<string, boolean>
  >({});
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [checkSize, setCheckSize] = useState("50-100k");
  const [timeline, setTimeline] = useState("30-90_days");
  const [involvement, setInvolvement] = useState("passive");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  // Preview
  const [previewMode, setPreviewMode] = useState<"limited" | "full">("full");
  const [showPreview, setShowPreview] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedSubcategoryKeys = useMemo(
    () =>
      Object.entries(selectedSubcats)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selectedSubcats]
  );

  // Load profile data
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      // Load public profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, verification_status, created_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setIsVerified(profile.verification_status === "verified");
        setMemberSince(profile.created_at);
      }

      // Load investor profile
      const { data: investorProfile } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (investorProfile) {
        setProfileId(investorProfile.id);
        setHeadline(investorProfile.headline ?? "");
        setBio(investorProfile.bio ?? "");
        setSelectedCategories(
          (investorProfile.categories ?? []) as CategoryKey[]
        );
        const map: Record<string, boolean> = {};
        for (const k of (investorProfile.subcategories ?? []) as string[]) {
          map[k] = true;
        }
        setSelectedSubcats(map);
        setTags((investorProfile.tags ?? []) as string[]);
        setCheckSize(investorProfile.check_size ?? "50-100k");
        setTimeline(investorProfile.timeline ?? "30-90_days");
        setInvolvement(investorProfile.involvement ?? "passive");
        setVerifiedOnly(Boolean(investorProfile.verified_only));
      }

      setLoading(false);
    };

    load();
  }, [supabase, router]);

  const toggleCategory = (key: CategoryKey) =>
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );

  const toggleSubcat = (key: string) =>
    setSelectedSubcats((prev) => ({ ...prev, [key]: !prev[key] }));

  const addTag = () => {
    const cleaned = tagInput.trim().toLowerCase();
    if (!cleaned || tags.includes(cleaned)) {
      setTagInput("");
      return;
    }
    setTags((t) => [...t, cleaned]);
    setTagInput("");
  };

  const removeTag = (t: string) =>
    setTags((prev) => prev.filter((x) => x !== t));

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    // Update profiles.full_name
    const { error: nameError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null })
      .eq("id", userId);

    if (nameError) {
      setToast({ type: "error", message: nameError.message });
      setSaving(false);
      return;
    }

    // Update investor_profiles
    const payload = {
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      categories: selectedCategories,
      subcategories: selectedSubcategoryKeys,
      tags,
      check_size: checkSize,
      timeline,
      involvement,
      verified_only: verifiedOnly,
      user_id: userId,
    };

    const { error: profileError } = profileId
      ? await supabase
          .from("investor_profiles")
          .update(payload)
          .eq("id", profileId)
      : await supabase.from("investor_profiles").insert(payload);

    if (profileError) {
      setToast({ type: "error", message: profileError.message });
      setSaving(false);
      return;
    }

    setToast({ type: "success", message: "Profile saved!" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[--text-muted]" />
      </div>
    );
  }

  // Preview component
  if (showPreview) {
    const anonymousName = userId
      ? `Investor #${userId.slice(-4).toUpperCase()}`
      : "Investor";
    const displayName =
      previewMode === "limited" ? anonymousName : fullName || anonymousName;

    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl">
          {/* Preview controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-[--text-muted] hover:text-[--text-primary] transition"
              >
                &larr; Back to Edit
              </button>
              <span className="text-sm text-[--text-muted]">|</span>
              <span className="text-sm font-medium">Preview Mode</span>
            </div>
            <div className="flex items-center gap-1 bg-[--bg-elevated] rounded-lg p-1 border border-[--border]">
              <button
                onClick={() => setPreviewMode("limited")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  previewMode === "limited"
                    ? "bg-teal-500 text-white"
                    : "text-[--text-muted] hover:text-[--text-primary]"
                }`}
              >
                Limited
              </button>
              <button
                onClick={() => setPreviewMode("full")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  previewMode === "full"
                    ? "bg-teal-500 text-white"
                    : "text-[--text-muted] hover:text-[--text-primary]"
                }`}
              >
                Full
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Header */}
            <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {isVerified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              {previewMode === "full" && headline && (
                <p className="text-[--text-secondary] mt-1">{headline}</p>
              )}
              {memberSince && (
                <p className="text-sm text-[--text-muted] mt-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since{" "}
                  {new Date(memberSince).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--text-muted] mb-1">
                  Check Size
                </div>
                <div className="text-lg font-semibold">
                  {formatCheckSize(checkSize)}
                </div>
              </div>
              <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--text-muted] mb-1">
                  Timeline
                </div>
                <div className="text-lg font-semibold">
                  {formatTimeline(timeline)}
                </div>
              </div>
              {previewMode === "limited" ? (
                <>
                  <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                    <div className="text-xs text-[--text-muted] mb-1">
                      Involvement
                    </div>
                    <div className="text-lg font-semibold">
                      {formatInvolvement(involvement)}
                    </div>
                  </div>
                  <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                    <div className="text-xs text-[--text-muted] mb-1">
                      Sectors
                    </div>
                    <div className="text-lg font-semibold">
                      {selectedCategories.length}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                    <div className="text-xs text-[--text-muted] mb-1">
                      Deals Committed
                    </div>
                    <div className="text-lg font-semibold">—</div>
                  </div>
                  <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                    <div className="text-xs text-[--text-muted] mb-1">
                      Total Invested
                    </div>
                    <div className="text-lg font-semibold">—</div>
                  </div>
                </>
              )}
            </div>

            {/* Bio */}
            {previewMode === "full" && bio && (
              <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-3">About</h2>
                <p className="text-[--text-secondary] whitespace-pre-wrap">
                  {bio}
                </p>
              </div>
            )}

            {/* Preferences */}
            <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                Investment Preferences
              </h2>
              {selectedCategories.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-[--text-muted] mb-2">
                    Preferred Sectors
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm text-teal-400"
                      >
                        {categoryLabel(cat)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {previewMode === "full" && selectedSubcategoryKeys.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-[--text-muted] mb-2">
                    Subcategories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubcategoryKeys.map((sub) => (
                      <span
                        key={sub}
                        className="px-3 py-1.5 rounded-full bg-[--bg-elevated] border border-[--border] text-sm text-[--text-secondary]"
                      >
                        {subcategoryLabel(sub)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-[--text-muted] mb-2">
                    Custom Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Locked section for limited preview */}
            {previewMode === "limited" && (
              <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 text-center">
                <Lock className="h-8 w-8 text-[--text-muted] mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">
                  Full Profile Locked
                </h3>
                <p className="text-sm text-[--text-muted]">
                  Operators must accept an introduction to see your full profile.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit form
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-[--text-secondary] mt-2">
              Manage how you appear to operators and other users.
            </p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 rounded-lg bg-[--bg-elevated] border border-[--border] px-4 py-2 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-hover] transition-all"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>

        {/* Personal Info */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Personal Info</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[--text-secondary]">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              />
            </div>
            <div>
              <label className="text-sm text-[--text-secondary]">
                Headline
              </label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Angel Investor | Real Estate & SaaS"
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              />
            </div>
            <div>
              <label className="text-sm text-[--text-secondary]">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell operators about yourself, your background, and what you're looking for..."
                rows={4}
                className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted] resize-none"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Investment Categories
          </h2>
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
                </button>
              );
            })}
          </div>
        </section>

        {/* Subcategories */}
        {selectedCategories.length > 0 && (
          <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Subcategories</h2>
            <div className="space-y-5">
              {selectedCategories.map((catKey) => (
                <div
                  key={catKey}
                  className="border border-[--border] rounded-2xl p-4 bg-[--bg-input]"
                >
                  <div className="font-semibold mb-3 text-teal-400">
                    {TAXONOMY[catKey].label}
                  </div>
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
          <h2 className="text-xl font-semibold mb-2">Custom Tags</h2>
          <p className="text-[--text-secondary] mb-4">
            Add keywords like &quot;coffee&quot;, &quot;gas station&quot;,
            &quot;self-storage&quot;.
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
              <label className="text-sm text-[--text-secondary]">
                Typical check size
              </label>
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
              <label className="text-sm text-[--text-secondary]">
                Timeline
              </label>
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
              <label className="text-sm text-[--text-secondary]">
                Involvement
              </label>
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
                <span className="text-sm text-[--text-secondary]">
                  Only show verified issuers
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center justify-between gap-4">
          <a
            href="/dashboard"
            className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4"
          >
            Cancel
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-teal-500 text-white px-6 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
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
