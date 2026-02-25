import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

// Create a Supabase client from raw Request cookies instead of next/headers cookies()
// This avoids issues with cookies() not seeing middleware-refreshed tokens in Next.js 16
function createClientFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const idx = c.indexOf("=");
      if (idx === -1) return { name: c, value: "" };
      return { name: c.slice(0, idx), value: c.slice(idx + 1) };
    });

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies;
        },
        setAll() {
          // No-op in API route context
        },
      },
    }
  );
}

export async function GET(req: Request) {
  console.log("[admin/analytics] GET request received");

  const cookieHeader = req.headers.get("cookie") || "";
  const hasSbCookie = cookieHeader.includes("sb-");
  console.log("[admin/analytics] has sb- cookie:", hasSbCookie, "cookie length:", cookieHeader.length);

  const supabase = createClientFromRequest(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("[admin/analytics] auth result:", user ? `user=${user.id}` : "no user", authError ? `err=${authError.message}` : "");

  if (!user) {
    return NextResponse.json(
      { error: authError?.message || "Unauthorized: no user session" },
      { status: 401 }
    );
  }

  // Use admin client to get role (bypasses RLS)
  const adminClient = createAdminClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[admin/analytics] profile:", profile, profileError ? `err=${profileError.message}` : "");

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: `Unauthorized: role is '${profile?.role ?? "unknown"}' not 'admin'` },
      { status: 401 }
    );
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    console.log("[admin/analytics] running queries...");

    const [
      profilesRes,
      dealsRes,
      conversationsRes,
      interestsRes,
      verificationsRes,
      recentProfilesRes,
      recentDealsRes,
    ] = await Promise.all([
      adminClient.from("profiles").select("id, created_at"),
      adminClient.from("deals").select("id, title, status, category, created_at"),
      adminClient.from("conversations").select("id"),
      adminClient.from("deal_interests").select("id, deal_id, created_at"),
      adminClient.from("verification_requests").select("id, status, created_at"),
      adminClient.from("profiles").select("id, created_at").gte("created_at", thirtyDaysAgo),
      adminClient.from("deals").select("id, status, created_at").gte("created_at", thirtyDaysAgo),
    ]);

    // Log any query errors but don't fail — use empty arrays
    const queryResults = {
      profiles: { count: profilesRes.data?.length ?? 0, error: profilesRes.error?.message },
      deals: { count: dealsRes.data?.length ?? 0, error: dealsRes.error?.message },
      conversations: { count: conversationsRes.data?.length ?? 0, error: conversationsRes.error?.message },
      interests: { count: interestsRes.data?.length ?? 0, error: interestsRes.error?.message },
      verifications: { count: verificationsRes.data?.length ?? 0, error: verificationsRes.error?.message },
      recentProfiles: { count: recentProfilesRes.data?.length ?? 0, error: recentProfilesRes.error?.message },
      recentDeals: { count: recentDealsRes.data?.length ?? 0, error: recentDealsRes.error?.message },
    };
    console.log("[admin/analytics] query results:", JSON.stringify(queryResults));

    // Use empty arrays for any failed queries instead of failing entirely
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
      const day = p.created_at?.slice(0, 10);
      if (day && userGrowthMap.has(day)) {
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
      const day = d.created_at?.slice(0, 10);
      if (day) {
        const entry = dealActivityMap.get(day);
        if (entry) {
          entry.created++;
          if (d.status === "active") entry.approved++;
        }
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
      verified: verifications.filter((v) => v.status === "approved").length,
      rejected: verifications.filter((v) => v.status === "rejected").length,
    };

    // Top deals by interest count
    const interestCountMap = new Map<string, number>();
    for (const i of interests) {
      if (i.deal_id) {
        interestCountMap.set(i.deal_id, (interestCountMap.get(i.deal_id) ?? 0) + 1);
      }
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
      if (p.created_at) {
        recentActivity.push({
          type: "user",
          description: "New user signed up",
          created_at: p.created_at,
        });
      }
    }
    for (const d of recentDeals.slice(0, 5)) {
      if (d.created_at) {
        recentActivity.push({
          type: "deal",
          description: `Deal created: ${dealMap.get(d.id)?.title ?? "Unknown"}`,
          created_at: d.created_at,
        });
      }
    }
    for (const v of verifications.slice(0, 5)) {
      if (v.created_at) {
        recentActivity.push({
          type: "verification",
          description: `Verification ${v.status}`,
          created_at: v.created_at,
        });
      }
    }

    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const result = {
      overview,
      userGrowth,
      dealActivity,
      verificationStats,
      topDeals,
      categoryBreakdown,
      recentActivity: recentActivity.slice(0, 10),
    };

    console.log("[admin/analytics] success, overview:", JSON.stringify(overview));
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[admin/analytics] uncaught error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
