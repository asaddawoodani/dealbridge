"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, SlidersHorizontal, X, Sparkles, ArrowRight } from "lucide-react";
import FundingProgress from "@/components/FundingProgress";

type Deal = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: string | null;
  min_check: string | null;
  location: string | null;
  status: string | null;
  target_raise: number | null;
  total_committed: number;
};

type InvestorProfile = {
  id: string;
  categories: string[];
  subcategories: string[];
  tags: string[];
  check_size: string | null;
  timeline: string | null;
  involvement: string | null;
  verified_only: boolean;
};

type ScoredDeal = Deal & { matchScore: number; matchReasons: string[] };

// -- Constants --

const CATEGORIES: { value: string; label: string }[] = [
  { value: "small-business", label: "Small Business" },
  { value: "real-estate", label: "Real Estate" },
  { value: "energy-infra", label: "Energy / Infra" },
  { value: "funds", label: "Funds" },
  { value: "tech-startups", label: "Tech / Startups" },
  { value: "services", label: "Services" },
];

const CHECK_SIZES: { value: string; label: string }[] = [
  { value: "under-25k", label: "Under $25K" },
  { value: "25k-100k", label: "$25K - $100K" },
  { value: "100k-500k", label: "$100K - $500K" },
  { value: "500k+", label: "$500K+" },
];

// Investor profiles use snake_case, deals use kebab-case
const CATEGORY_SNAKE_TO_KEBAB: Record<string, string> = {
  small_business: "small-business",
  real_estate: "real-estate",
  energy_infra: "energy-infra",
  funds: "funds",
  tech_startups: "tech-startups",
  services: "services",
};

// -- Helpers --

function parseCheckToNumber(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "").toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m)?/);
  if (!match) return null;
  let num = parseFloat(match[1]);
  if (match[2] === "k") num *= 1_000;
  if (match[2] === "m") num *= 1_000_000;
  return num;
}

function matchesCheckSize(deal: Deal, filter: string): boolean {
  const num = parseCheckToNumber(deal.min_check);
  if (num === null) return true;
  switch (filter) {
    case "under-25k":
      return num < 25_000;
    case "25k-100k":
      return num >= 25_000 && num <= 100_000;
    case "100k-500k":
      return num > 100_000 && num <= 500_000;
    case "500k+":
      return num > 500_000;
    default:
      return true;
  }
}

function investorCheckSizeToRange(
  checkSize: string | null
): { min: number; max: number } | null {
  if (!checkSize) return null;
  switch (checkSize) {
    case "<25k":
      return { min: 0, max: 25_000 };
    case "25-50k":
      return { min: 25_000, max: 50_000 };
    case "50-100k":
      return { min: 50_000, max: 100_000 };
    case "100-250k":
      return { min: 100_000, max: 250_000 };
    case "250-500k":
      return { min: 250_000, max: 500_000 };
    case "500k+":
      return { min: 500_000, max: Infinity };
    default:
      return null;
  }
}

function checkSizeAligns(
  dealMinCheck: string | null,
  investorCheckSize: string | null
): boolean {
  const dealNum = parseCheckToNumber(dealMinCheck);
  const range = investorCheckSizeToRange(investorCheckSize);
  if (dealNum === null || range === null) return false;
  return dealNum <= range.max && dealNum >= range.min * 0.5;
}

function scoreDeal(deal: Deal, profile: InvestorProfile): ScoredDeal {
  let score = 0;
  const reasons: string[] = [];

  // +2 for category match
  const dealCat = deal.category ?? "";
  const investorCats = profile.categories.map(
    (c) => CATEGORY_SNAKE_TO_KEBAB[c] ?? c.replace(/_/g, "-")
  );
  if (dealCat && investorCats.includes(dealCat)) {
    score += 2;
    reasons.push("category");
  }

  // +1 for check size alignment
  if (checkSizeAligns(deal.min_check, profile.check_size)) {
    score += 1;
    reasons.push("check_size");
  }

  // +1 for tag keyword match in title or description
  if (profile.tags.length > 0) {
    const haystack = [deal.title, deal.description ?? ""]
      .join(" ")
      .toLowerCase();
    const matchedTag = profile.tags.find((tag) =>
      haystack.includes(tag.toLowerCase())
    );
    if (matchedTag) {
      score += 1;
      reasons.push(`tag:${matchedTag}`);
    }
  }

  return { ...deal, matchScore: score, matchReasons: reasons };
}

function MatchBadge({ score }: { score: number }) {
  if (score >= 3) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        Great Match
      </span>
    );
  }
  if (score >= 2) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
        Good Match
      </span>
    );
  }
  return null;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function labelCategory(c: string | null) {
  if (!c) return "---";
  return c.replaceAll("-", " ");
}

// -- Main component --

function DealsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state from URL
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [checkSize, setCheckSize] = useState(searchParams.get("check") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "active");

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Investor profile for matching
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Sync filters to URL
  const syncUrl = useCallback(
    (q: string, cat: string, check: string, status: string) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      if (check) params.set("check", check);
      if (status && status !== "active") params.set("status", status);
      const qs = params.toString();
      router.replace(`/deals${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  // Fetch all deals once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/deals?status=all");
      const json = await res.json().catch(() => null);
      setDeals(json?.deals ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // Fetch investor profile
  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.warn("[deals] No auth user:", authError?.message);
          setProfileLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("investor_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn("[deals] Profile fetch error:", error.message);
        }

        setInvestorProfile(data ?? null);
      } catch (err) {
        console.warn("[deals] Profile fetch failed:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  const updateSearch = (v: string) => {
    setSearch(v);
    syncUrl(v, category, checkSize, statusFilter);
  };
  const updateCategory = (v: string) => {
    setCategory(v);
    syncUrl(search, v, checkSize, statusFilter);
  };
  const updateCheckSize = (v: string) => {
    setCheckSize(v);
    syncUrl(search, category, v, statusFilter);
  };
  const updateStatus = (v: string) => {
    setStatusFilter(v);
    syncUrl(search, category, checkSize, v);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCheckSize("");
    setStatusFilter("active");
    router.replace("/deals", { scroll: false });
  };

  const hasFilters = search || category || checkSize || statusFilter !== "active";

  // Client-side filtering
  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (statusFilter && statusFilter !== "all" && d.status !== statusFilter) return false;
      if (category && d.category !== category) return false;
      if (checkSize && !matchesCheckSize(d, checkSize)) return false;
      if (search) {
        const s = search.toLowerCase();
        const haystack = [d.title, d.description ?? "", d.location ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [deals, search, category, checkSize, statusFilter]);

  // Recommended deals: score against profile, keep score >= 2, top 6
  const recommendedDeals = useMemo(() => {
    if (!investorProfile) return [];
    return filtered
      .map((deal) => scoreDeal(deal, investorProfile))
      .filter((d) => d.matchScore >= 2)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }, [filtered, investorProfile]);

  const recommendedScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of recommendedDeals) map.set(d.id, d.matchScore);
    return map;
  }, [recommendedDeals]);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Deals</h1>
        <p className="text-[--text-secondary] mt-2">
          Browse opportunities from vetted operators and groups on DealBridge.
        </p>
      </div>

      {/* Filters */}
      <section className="bg-[--bg-card] border border-[--border] rounded-2xl p-5 mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[--text-muted]" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search deals by title, description, or location..."
            className="w-full rounded-xl bg-[--bg-input] border border-[--border] pl-11 pr-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={category}
            onChange={(e) => updateCategory(e.target.value)}
            className="rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={checkSize}
            onChange={(e) => updateCheckSize(e.target.value)}
            className="rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
          >
            <option value="">Any investment size</option>
            {CHECK_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none"
          >
            <option value="active">Active only</option>
            <option value="all">All statuses</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-[--text-muted] flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filtered.length} deal{filtered.length !== 1 ? "s" : ""} found
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-[--text-muted] hover:text-[--text-primary] flex items-center gap-1 transition py-1 px-2 -mr-2"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Recommended: No profile prompt */}
      {!loading && !profileLoading && !investorProfile && (
        <section className="rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-500/5 to-transparent p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-400" />
                Recommended for You
              </h2>
              <p className="text-[--text-secondary] mt-1 text-sm">
                Complete your investor profile to get personalized deal recommendations.
              </p>
            </div>
            <a
              href="/onboarding"
              className="shrink-0 rounded-xl bg-teal-500 text-white px-5 py-2.5 font-semibold hover:bg-teal-600 transition-all text-sm flex items-center gap-1.5"
            >
              Complete Profile
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}

      {/* Recommended: Matched deals */}
      {!loading && !profileLoading && investorProfile && recommendedDeals.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-400" />
              Recommended for You
            </h2>
            <span className="text-sm text-[--text-muted]">Based on your investor profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedDeals.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="rounded-2xl border border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-[--bg-card] p-5 hover:border-teal-500/40 transition-all block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{d.title}</div>
                    <div className="text-sm text-[--text-muted] mt-1">
                      {labelCategory(d.category)} / {d.location ?? "---"} /{" "}
                      {d.min_check ?? "---"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <MatchBadge score={d.matchScore} />
                    <span
                      className={[
                        "text-xs px-2 py-1 rounded-full border",
                        d.status === "active"
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : "border-[--border] text-[--text-muted]",
                      ].join(" ")}
                    >
                      {d.status ?? "---"}
                    </span>
                  </div>
                </div>

                {d.description && (
                  <p className="text-sm text-[--text-secondary] mt-3 line-clamp-3">{d.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-[--text-muted]">
                  <span>Posted {fmtDate(d.created_at)}</span>
                  <span className="text-teal-400 flex items-center gap-1">
                    View details <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Divider */}
      {!loading && !profileLoading && investorProfile && recommendedDeals.length > 0 && filtered.length > 0 && (
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[--border]" />
          <span className="text-sm text-[--text-muted]">All Deals</span>
          <div className="h-px flex-1 bg-[--border]" />
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-[--text-secondary]">
          Loading deals...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-center">
          <div className="text-xl font-semibold mb-2">No deals match your filters</div>
          <p className="text-[--text-secondary]">Try broadening your search or clearing filters.</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-xl bg-teal-500 text-white px-5 py-2.5 font-semibold hover:bg-teal-600 transition-all"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}`}
              className="rounded-2xl border border-[--border] bg-[--bg-card] p-5 hover:border-[--border-hover] transition-all block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{d.title}</div>
                  <div className="text-sm text-[--text-muted] mt-1">
                    {labelCategory(d.category)} / {d.location ?? "---"} /{" "}
                    {d.min_check ?? "---"}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {recommendedScores.has(d.id) && (
                    <MatchBadge score={recommendedScores.get(d.id)!} />
                  )}
                  <span
                    className={[
                      "text-xs px-2 py-1 rounded-full border",
                      d.status === "active"
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : "border-[--border] text-[--text-muted]",
                    ].join(" ")}
                  >
                    {d.status ?? "---"}
                  </span>
                </div>
              </div>

              {d.description && (
                <p className="text-sm text-[--text-secondary] mt-3 line-clamp-3">{d.description}</p>
              )}

              <FundingProgress
                targetRaise={d.target_raise}
                totalCommitted={d.total_committed ?? 0}
                compact
              />

              <div className="mt-4 flex items-center justify-between text-xs text-[--text-muted]">
                <span>Posted {fmtDate(d.created_at)}</span>
                <span className="text-teal-400 flex items-center gap-1">
                  View details <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  return (
    <div className="px-4 sm:px-6 py-10">
      <Suspense fallback={<div className="mx-auto max-w-6xl text-[--text-muted]">Loading...</div>}>
        <DealsContent />
      </Suspense>
    </div>
  );
}
