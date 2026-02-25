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
      .select("*, profiles(full_name, email, role)")
      .order("created_at", { ascending: false });

    if (statusFilter && ["pending", "approved", "rejected", "expired"].includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }

    const { data: submissions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute stats
    const all = submissions ?? [];
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
