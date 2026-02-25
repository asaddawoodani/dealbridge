import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

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
        setAll() {},
      },
    }
  );
}

export async function GET(req: Request) {
  const supabase = createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "operator" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get operator's deals
    const { data: deals } = await admin
      .from("deals")
      .select("id, title, status")
      .eq("operator_id", user.id);

    const operatorDeals = deals ?? [];
    const dealIds = operatorDeals.map((d) => d.id);

    if (dealIds.length === 0) {
      return NextResponse.json({
        totalInterests: 0,
        totalConversations: 0,
        totalMessages: 0,
        dealPerformance: [],
        statusBreakdown: { active: 0, pending: 0, inactive: 0 },
      });
    }

    // Get conversations for this operator first
    const { data: convos } = await admin
      .from("conversations")
      .select("id, deal_id")
      .eq("operator_id", user.id);
    const conversations = convos ?? [];
    const convoIds = conversations.map((c) => c.id);

    // Fetch interests and messages
    const [interestsRes, messagesRes] = await Promise.all([
      admin.from("deal_interests").select("id, deal_id").in("deal_id", dealIds),
      convoIds.length > 0
        ? admin.from("messages").select("id, conversation_id").in("conversation_id", convoIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const interests = interestsRes.data ?? [];
    const messages = messagesRes.data ?? [];

    // Build per-deal stats
    const interestsByDeal = new Map<string, number>();
    for (const i of interests) {
      interestsByDeal.set(i.deal_id, (interestsByDeal.get(i.deal_id) ?? 0) + 1);
    }

    const convosByDeal = new Map<string, number>();
    for (const c of conversations) {
      convosByDeal.set(c.deal_id, (convosByDeal.get(c.deal_id) ?? 0) + 1);
    }

    const dealPerformance = operatorDeals.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      interestCount: interestsByDeal.get(d.id) ?? 0,
      conversationCount: convosByDeal.get(d.id) ?? 0,
    }));

    const statusBreakdown = {
      active: operatorDeals.filter((d) => d.status === "active").length,
      pending: operatorDeals.filter((d) => d.status === "pending").length,
      inactive: operatorDeals.filter((d) => d.status === "inactive").length,
    };

    return NextResponse.json({
      totalInterests: interests.length,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      dealPerformance,
      statusBreakdown,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
