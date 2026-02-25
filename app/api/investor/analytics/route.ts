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

  const admin = createAdminClient();

  try {
    // Fetch investor's interests, conversations, and unread messages
    const [interestsRes, conversationsRes] = await Promise.all([
      admin.from("deal_interests").select("id, deal_id, created_at").eq("user_id", user.id),
      admin
        .from("conversations")
        .select("id, deal_id, created_at, last_message_at")
        .eq("investor_id", user.id),
    ]);

    const interests = interestsRes.data ?? [];
    const conversations = conversationsRes.data ?? [];
    const convoIds = conversations.map((c) => c.id);

    // Count unread messages
    let unreadMessages = 0;
    if (convoIds.length > 0) {
      const { count } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .neq("sender_id", user.id)
        .eq("read", false);

      unreadMessages = count ?? 0;
    }

    // Recent activity
    type ActivityItem = { type: string; description: string; created_at: string };
    const recentActivity: ActivityItem[] = [];

    // Get deal titles for interests
    const dealIds = [...new Set(interests.map((i) => i.deal_id))];
    let dealMap = new Map<string, string>();
    if (dealIds.length > 0) {
      const { data: deals } = await admin
        .from("deals")
        .select("id, title")
        .in("id", dealIds);
      dealMap = new Map((deals ?? []).map((d) => [d.id, d.title]));
    }

    for (const i of interests) {
      recentActivity.push({
        type: "intro",
        description: `Intro requested for ${dealMap.get(i.deal_id) ?? "a deal"}`,
        created_at: i.created_at,
      });
    }

    for (const c of conversations) {
      recentActivity.push({
        type: "conversation",
        description: `Conversation started`,
        created_at: c.created_at,
      });
    }

    recentActivity.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      introsSent: interests.length,
      activeConversations: conversations.length,
      unreadMessages,
      recentActivity: recentActivity.slice(0, 5),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
