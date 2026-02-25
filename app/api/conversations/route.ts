import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate } from "@/lib/email";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, verification_status, full_name, email")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: (profile?.role ?? "investor") as string,
    verificationStatus: (profile?.verification_status ?? "unverified") as string,
    fullName: (profile?.full_name ?? null) as string | null,
    email: (profile?.email ?? user.email ?? "") as string,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = auth.user.id;
  const isAdmin = auth.role === "admin";

  // Fetch conversations the user is part of (or all for admin)
  let query = admin
    .from("conversations")
    .select("id, deal_id, investor_id, operator_id, last_message_at, created_at")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (!isAdmin) {
    query = query.or(`investor_id.eq.${userId},operator_id.eq.${userId}`);
  }

  const { data: conversations, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // Gather IDs for batch lookups
  const dealIds = [...new Set(conversations.map((c) => c.deal_id))];
  const userIds = [
    ...new Set(
      conversations.flatMap((c) => [c.investor_id, c.operator_id])
    ),
  ];
  const convoIds = conversations.map((c) => c.id);

  // Batch: deals
  const { data: deals } = await admin
    .from("deals")
    .select("id, title")
    .in("id", dealIds);
  const dealMap = new Map((deals ?? []).map((d) => [d.id, d]));

  // Batch: profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Batch: latest message per conversation
  // Use a raw query approach: get all messages for these convos, group in JS
  const { data: allMessages } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, content, read, created_at")
    .in("conversation_id", convoIds)
    .order("created_at", { ascending: false });

  type MsgRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    read: boolean;
    created_at: string;
  };

  const latestMessageMap = new Map<string, MsgRow>();
  const unreadCountMap = new Map<string, number>();

  for (const msg of (allMessages ?? []) as MsgRow[]) {
    // Latest message per conversation
    if (!latestMessageMap.has(msg.conversation_id)) {
      latestMessageMap.set(msg.conversation_id, msg);
    }
    // Unread count: messages not from the current user and not read
    if (!isAdmin && msg.sender_id !== userId && !msg.read) {
      unreadCountMap.set(
        msg.conversation_id,
        (unreadCountMap.get(msg.conversation_id) ?? 0) + 1
      );
    }
  }

  const enriched = conversations.map((c) => {
    const otherUserId =
      c.investor_id === userId ? c.operator_id : c.investor_id;
    const otherProfile = profileMap.get(otherUserId);
    const deal = dealMap.get(c.deal_id);
    const latest = latestMessageMap.get(c.id);

    return {
      id: c.id,
      deal_id: c.deal_id,
      deal_title: deal?.title ?? "Unknown deal",
      other_user: {
        id: otherUserId,
        name: otherProfile?.full_name || otherProfile?.email || "Unknown",
      },
      last_message: latest
        ? { content: latest.content, created_at: latest.created_at, sender_id: latest.sender_id }
        : null,
      unread_count: unreadCountMap.get(c.id) ?? 0,
      created_at: c.created_at,
    };
  });

  return NextResponse.json({ conversations: enriched });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.verificationStatus !== "verified") {
    return NextResponse.json(
      { error: "Account verification required." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dealId = String(body?.deal_id ?? "").trim();
    const messageContent = String(body?.message ?? "").trim();

    if (!dealId) {
      return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
    }
    if (!messageContent) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch deal to get operator_id
    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id, title, operator_id")
      .eq("id", dealId)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    if (!deal.operator_id) {
      return NextResponse.json({ error: "Deal has no operator" }, { status: 400 });
    }

    // Prevent self-conversation
    if (deal.operator_id === auth.user.id) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 }
      );
    }

    // Check for existing conversation
    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("deal_id", dealId)
      .eq("investor_id", auth.user.id)
      .maybeSingle();

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
    } else {
      // Create new conversation
      const { data: convo, error: convoErr } = await admin
        .from("conversations")
        .insert({
          deal_id: dealId,
          investor_id: auth.user.id,
          operator_id: deal.operator_id,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (convoErr) {
        return NextResponse.json({ error: convoErr.message }, { status: 500 });
      }
      conversationId = convo.id;
    }

    // Insert the message
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: auth.user.id,
        content: messageContent,
      })
      .select("*")
      .single();

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // Update last_message_at
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Send email notification to operator
    const { data: operatorProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", deal.operator_id)
      .single();

    if (operatorProfile?.email) {
      const senderName = auth.fullName || auth.email;
      const appUrl = new URL(req.url).origin;

      sendEmail({
        to: operatorProfile.email,
        subject: `New message from ${senderName} about ${deal.title}`,
        html: emailTemplate({
          title: "New Message",
          body: `<strong>${senderName}</strong> sent you a message about <strong>${deal.title}</strong>.<br/><br/>"${messageContent.slice(0, 200)}${messageContent.length > 200 ? "..." : ""}"`,
          ctaText: "View Conversation",
          ctaUrl: `${appUrl}/messages/${conversationId}`,
        }),
      }).catch((err: unknown) =>
        console.error("[email] conversation notification failed:", err)
      );
    }

    return NextResponse.json(
      { conversation: { id: conversationId }, message: msg },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
