import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ShieldCheck, Calendar, Lock } from "lucide-react";
import { categoryLabel, subcategoryLabel } from "@/lib/taxonomy";
import AcceptIntroButton from "./AcceptIntroButton";
import Link from "next/link";

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

function formatCurrency(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default async function InvestorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: investorId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch investor profile
  const { data: investorProfile } = await admin
    .from("investor_profiles")
    .select("*")
    .eq("user_id", investorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!investorProfile) {
    redirect("/deals");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, verification_status, created_at")
    .eq("id", investorId)
    .single();

  if (!profile || profile.role !== "investor") {
    redirect("/deals");
  }

  // Determine disclosure level
  let level: "self" | "full" | "limited" = "limited";
  let viewerRole: string | null = null;
  let pendingInterests: { id: string; deal_title: string }[] = [];

  if (user) {
    if (user.id === investorId) {
      level = "self";
    } else {
      const { data: viewerProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      viewerRole = viewerProfile?.role ?? null;

      if (viewerRole === "admin") {
        level = "full";
      } else if (viewerRole === "operator") {
        const { data: operatorDeals } = await admin
          .from("deals")
          .select("id, title")
          .eq("operator_id", user.id);

        const dealIds = (operatorDeals ?? []).map((d) => d.id);

        if (dealIds.length > 0) {
          // Check for accepted intros
          const { data: acceptedInterest } = await admin
            .from("deal_interests")
            .select("id")
            .eq("user_id", investorId)
            .eq("status", "accepted")
            .in("deal_id", dealIds)
            .limit(1)
            .maybeSingle();

          if (acceptedInterest) {
            level = "full";
          }

          // Also fetch pending intros for the accept button
          const { data: pendingRows } = await admin
            .from("deal_interests")
            .select("id, deal_id")
            .eq("user_id", investorId)
            .eq("status", "pending")
            .in("deal_id", dealIds);

          if (pendingRows && pendingRows.length > 0) {
            const dealMap = new Map(
              (operatorDeals ?? []).map((d) => [d.id, d.title])
            );
            pendingInterests = pendingRows.map((r) => ({
              id: r.id,
              deal_title: dealMap.get(r.deal_id) ?? "Unknown deal",
            }));
          }
        }
      }
    }
  }

  // Commitment stats for full/self
  let dealsCommitted = 0;
  let totalInvested = 0;

  if (level === "full" || level === "self") {
    const { data: commitments } = await admin
      .from("investment_commitments")
      .select("amount, status")
      .eq("investor_id", investorId)
      .in("status", ["committed", "funded", "completed"]);

    dealsCommitted = commitments?.length ?? 0;
    totalInvested = (commitments ?? []).reduce(
      (sum, c) => sum + (Number(c.amount) || 0),
      0
    );
  }

  const isVerified = profile.verification_status === "verified";
  const anonymousName = `Investor #${investorId.slice(-4).toUpperCase()}`;
  const displayName =
    level === "limited" ? anonymousName : (profile.full_name ?? anonymousName);
  const categories: string[] = investorProfile.categories ?? [];
  const subcategories: string[] = investorProfile.subcategories ?? [];
  const tags: string[] = investorProfile.tags ?? [];

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {isVerified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              {(level === "full" || level === "self") && investorProfile.headline && (
                <p className="text-[--text-secondary] mt-1">
                  {investorProfile.headline}
                </p>
              )}
              <p className="text-sm text-[--text-muted] mt-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Member since {formatDate(profile.created_at)}
              </p>
            </div>

            {level === "self" && (
              <Link
                href="/profile"
                className="rounded-lg bg-[--bg-elevated] border border-[--border] px-4 py-2 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-hover] transition-all shrink-0"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className={`grid gap-4 ${level === "limited" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
          <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
            <div className="text-xs text-[--text-muted] mb-1">Check Size</div>
            <div className="text-lg font-semibold">{formatCheckSize(investorProfile.check_size)}</div>
          </div>
          <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
            <div className="text-xs text-[--text-muted] mb-1">Timeline</div>
            <div className="text-lg font-semibold">{formatTimeline(investorProfile.timeline)}</div>
          </div>
          {level === "limited" ? (
            <>
              <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--text-muted] mb-1">Involvement</div>
                <div className="text-lg font-semibold">{formatInvolvement(investorProfile.involvement)}</div>
              </div>
              <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--text-muted] mb-1">Sectors</div>
                <div className="text-lg font-semibold">{categories.length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--text-muted] mb-1">Deals Committed</div>
                <div className="text-lg font-semibold">{dealsCommitted}</div>
              </div>
              <div className="bg-[--bg-card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--text-muted] mb-1">Total Invested</div>
                <div className="text-lg font-semibold">{totalInvested > 0 ? formatCurrency(totalInvested) : "—"}</div>
              </div>
            </>
          )}
        </div>

        {/* Bio (full/self only) */}
        {(level === "full" || level === "self") && investorProfile.bio && (
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-[--text-secondary] whitespace-pre-wrap">
              {investorProfile.bio}
            </p>
          </div>
        )}

        {/* Investment Preferences */}
        <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Investment Preferences</h2>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-[--text-muted] mb-2">Preferred Sectors</div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
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

          {/* Subcategories (full/self only) */}
          {(level === "full" || level === "self") && subcategories.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-[--text-muted] mb-2">Subcategories</div>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((sub) => (
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

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-[--text-muted] mb-2">Custom Tags</div>
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

          {/* Full view extras */}
          {(level === "full" || level === "self") && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[--border]">
              <div>
                <div className="text-sm text-[--text-muted]">Involvement</div>
                <div className="font-medium">{formatInvolvement(investorProfile.involvement)}</div>
              </div>
              <div>
                <div className="text-sm text-[--text-muted]">Verified Deals Only</div>
                <div className="font-medium">{investorProfile.verified_only ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Locked section for operators with pending intros */}
        {level === "limited" && pendingInterests.length > 0 && (
          <AcceptIntroButton pendingInterests={pendingInterests} />
        )}

        {/* Locked indicator for limited view with no pending intros */}
        {level === "limited" && pendingInterests.length === 0 && (
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 text-center">
            <Lock className="h-8 w-8 text-[--text-muted] mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">Full Profile Locked</h3>
            <p className="text-sm text-[--text-muted]">
              Accept an introduction to view this investor&apos;s full profile including their name, bio, and investment history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
