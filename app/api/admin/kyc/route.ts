import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
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
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");

    let query = admin
      .from("kyc_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter && ["pending", "approved", "rejected", "expired"].includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }

    const { data: submissions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profiles separately (user_id FKs to auth.users, not profiles)
    const userIds = [...new Set((submissions ?? []).map((s) => s.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await admin.from("profiles").select("id, full_name, email, role").in("id", userIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    // Compute stats
    const all = (submissions ?? []).map((s) => ({
      ...s,
      profiles: profileMap[s.user_id] ?? null,
    }));
    const stats = {
      pending: all.filter((s) => s.status === "pending").length,
      approved: all.filter((s) => s.status === "approved").length,
      rejected: all.filter((s) => s.status === "rejected").length,
      expired: all.filter((s) => s.status === "expired").length,
    };

    return NextResponse.json({
      submissions: all,
      stats: statusFilter ? undefined : stats,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
