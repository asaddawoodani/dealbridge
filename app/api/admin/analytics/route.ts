import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Run all queries in parallel
    const [
      profilesRes,
      dealsRes,
      conversationsRes,
      interestsRes,
      verificationsRes,
      recentProfilesRes,
      recentDealsRes,
    ] = await Promise.all([
      admin.from("profiles").select("id, created_at"),
      admin.from("deals").select("id, title, status, category, created_at"),
      admin.from("conversations").select("id"),
      admin.from("deal_interests").select("id, deal_id, created_at"),
      admin.from("verification_requests").select("id, status, created_at"),
      admin.from("profiles").select("id, created_at").gte("created_at", thirtyDaysAgo),
      admin.from("deals").select("id, status, created_at").gte("created_at", thirtyDaysAgo),
    ]);

    const profiles = profilesRes.data ?? [];
    const deals = dealsRes.data ?? [];
    const conversations = conversationsRes.data ?? [];
    const interests = interestsRes.data ?? [];
    const verifications = verificationsRes.data ?? [];
    const recentProfiles = recentProfilesRes.data ?? [];
    const recentDeals = recentDealsRes.data ?? [];

    // Overview
    const overview = {
      totalUsers: profiles.length,
      totalDeals: deals.length,
      activeDeals: deals.filter((d) => d.status === "active").length,
      pendingDeals: deals.filter((d) => d.status === "pending").length,
      totalConversations: conversations.length,
      totalIntros: interests.length,
    };

    // User growth (last 30 days)
    const userGrowthMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      userGrowthMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const p of recentProfiles) {
      const day = p.created_at.slice(0, 10);
      if (userGrowthMap.has(day)) {
        userGrowthMap.set(day, userGrowthMap.get(day)! + 1);
      }
    }
    const userGrowth = Array.from(userGrowthMap, ([date, count]) => ({ date, count }));

    // Deal activity (last 30 days)
    const dealActivityMap = new Map<string, { created: number; approved: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      dealActivityMap.set(d.toISOString().slice(0, 10), { created: 0, approved: 0 });
    }
    for (const d of recentDeals) {
      const day = d.created_at.slice(0, 10);
      const entry = dealActivityMap.get(day);
      if (entry) {
        entry.created++;
        if (d.status === "active") entry.approved++;
      }
    }
    const dealActivity = Array.from(dealActivityMap, ([date, v]) => ({
      date,
      created: v.created,
      approved: v.approved,
    }));

    // Verification stats
    const verificationStats = {
      pending: verifications.filter((v) => v.status === "pending").length,
      verified: verifications.filter((v) => v.status === "verified").length,
      rejected: verifications.filter((v) => v.status === "rejected").length,
    };

    // Top deals by interest count
    const interestCountMap = new Map<string, number>();
    for (const i of interests) {
      interestCountMap.set(i.deal_id, (interestCountMap.get(i.deal_id) ?? 0) + 1);
    }
    const dealMap = new Map(deals.map((d) => [d.id, d]));
    const topDeals = Array.from(interestCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dealId, interestCount]) => ({
        id: dealId,
        title: dealMap.get(dealId)?.title ?? "Unknown",
        interestCount,
      }));

    // Category breakdown
    const categoryMap = new Map<string, number>();
    for (const d of deals) {
      const cat = d.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const categoryBreakdown = Array.from(categoryMap, ([category, count]) => ({
      category,
      count,
    })).sort((a, b) => b.count - a.count);

    // Recent activity (last 10 events)
    type ActivityItem = { type: string; description: string; created_at: string };
    const recentActivity: ActivityItem[] = [];

    for (const p of recentProfiles.slice(0, 5)) {
      recentActivity.push({
        type: "user",
        description: "New user signed up",
        created_at: p.created_at,
      });
    }
    for (const d of recentDeals.slice(0, 5)) {
      recentActivity.push({
        type: "deal",
        description: `Deal created: ${dealMap.get(d.id)?.title ?? "Unknown"}`,
        created_at: d.created_at,
      });
    }
    for (const v of verifications.slice(0, 5)) {
      recentActivity.push({
        type: "verification",
        description: `Verification ${v.status}`,
        created_at: v.created_at,
      });
    }

    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      overview,
      userGrowth,
      dealActivity,
      verificationStats,
      topDeals,
      categoryBreakdown,
      recentActivity: recentActivity.slice(0, 10),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
