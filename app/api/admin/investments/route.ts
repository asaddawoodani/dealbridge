import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — Admin-only: all commitments + stats
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
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: commitments, error } = await admin
    .from("investment_commitments")
    .select("*, deals(id, title, category)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch investor profiles separately (FK points to auth.users, not profiles)
  const investorIds = [...new Set((commitments ?? []).map((c) => c.investor_id))];
  const { data: profiles } = investorIds.length > 0
    ? await admin.from("profiles").select("id, full_name, email").in("id", investorIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const all = (commitments ?? []).map((c) => ({
    ...c,
    profiles: profileMap[c.investor_id] ?? null,
  }));

  const stats = {
    total: all.length,
    totalAmount: all.reduce((sum, c) => sum + (c.amount ?? 0), 0),
    byStatus: {
      draft: all.filter((c) => c.status === "draft").length,
      committed: all.filter((c) => c.status === "committed").length,
      funded: all.filter((c) => c.status === "funded").length,
      completed: all.filter((c) => c.status === "completed").length,
      cancelled: all.filter((c) => c.status === "cancelled").length,
    },
    largeCount: all.filter((c) => c.amount >= 100_000).length,
  };

  return NextResponse.json({ commitments: all, stats });
}
