import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
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
    await admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  } else if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
    await admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .in("id", body.notificationIds);
  } else {
    return NextResponse.json(
      { error: "Provide notificationIds or all: true" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
