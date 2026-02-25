import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const admin = createAdminClient();

  let query = admin
    .from("verification_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch profiles separately (verification_requests.user_id FKs to auth.users, not profiles)
  const userIds = [...new Set((data ?? []).map((v) => v.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await admin.from("profiles").select("id, email, full_name, role").in("id", userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const verifications = (data ?? []).map((v) => ({
    ...v,
    profiles: profileMap[v.user_id] ?? null,
  }));

  return NextResponse.json({ verifications });
}
