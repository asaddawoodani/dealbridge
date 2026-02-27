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

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const unreadOnly = url.searchParams.get("unread") === "true";

  const admin = createAdminClient();

  let query = admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const [{ data: notifications, error }, { count }] = await Promise.all([
    query,
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: count ?? 0,
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  if (body.all) {
    await admin.from("notifications").delete().eq("user_id", user.id);
  } else if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
    await admin
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .in("id", body.notificationIds);
  } else {
    return NextResponse.json({ error: "Provide notificationIds or all: true" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
