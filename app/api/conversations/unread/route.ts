import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    const admin = createAdminClient();
    const userId = user.id;

    // Get all conversation IDs the user is part of
    const { data: conversations } = await admin
      .from("conversations")
      .select("id")
      .or(`investor_id.eq.${userId},operator_id.eq.${userId}`);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const convoIds = conversations.map((c) => c.id);

    // Count unread messages not sent by the user
    const { count, error } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .neq("sender_id", userId)
      .eq("read", false);

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
