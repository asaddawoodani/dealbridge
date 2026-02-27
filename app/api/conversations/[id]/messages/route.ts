import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate } from "@/lib/email";
import { sendNotification, sendAdminNotification } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string }> };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: (profile?.role ?? "investor") as string,
    fullName: (profile?.full_name ?? null) as string | null,
    email: (profile?.email ?? user.email ?? "") as string,
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const admin = createAdminClient();

  // Fetch conversation and verify access
  const { data: convo, error: convoErr } = await admin
    .from("conversations")
    .select("id, deal_id, investor_id, operator_id")
    .eq("id", id)
    .single();

  if (convoErr || !convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const isParticipant =
    convo.investor_id === auth.user.id || convo.operator_id === auth.user.id;
  const isAdmin = auth.role === "admin";

  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch messages
  const { data: messages, error: msgErr } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, content, read, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // Mark unread messages from other party as read
  if (isParticipant) {
    const unreadIds = (messages ?? [])
      .filter((m) => m.sender_id !== auth.user.id && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await admin
        .from("messages")
        .update({ read: true })
        .in("id", unreadIds);
    }
  }

  // Fetch conversation metadata for the thread header
  const { data: deal } = await admin
    .from("deals")
    .select("id, title")
    .eq("id", convo.deal_id)
    .single();

  const otherUserId =
    convo.investor_id === auth.user.id ? convo.operator_id : convo.investor_id;
  const { data: otherProfile } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", otherUserId)
    .single();

  return NextResponse.json({
    conversation: {
      id: convo.id,
      deal_id: convo.deal_id,
      deal_title: deal?.title ?? "Unknown deal",
      investor_id: convo.investor_id,
      operator_id: convo.operator_id,
      other_user: {
        id: otherUserId,
        name: otherProfile?.full_name || otherProfile?.email || "Unknown",
      },
    },
    messages: messages ?? [],
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const admin = createAdminClient();

  // Verify conversation access
  const { data: convo, error: convoErr } = await admin
    .from("conversations")
    .select("id, deal_id, investor_id, operator_id")
    .eq("id", id)
    .single();

  if (convoErr || !convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const isParticipant =
    convo.investor_id === auth.user.id || convo.operator_id === auth.user.id;
  const isAdmin = auth.role === "admin";

  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const content = String(body?.content ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Insert message
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .insert({
        conversation_id: id,
        sender_id: auth.user.id,
        content,
      })
      .select("*")
      .single();

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // Update conversation last_message_at
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id);

    // Determine recipients — notify all other parties in the conversation
    const recipientIds: string[] = [];
    if (convo.investor_id !== auth.user.id) recipientIds.push(convo.investor_id);
    if (convo.operator_id !== auth.user.id) recipientIds.push(convo.operator_id);

    const senderName = auth.fullName || auth.email;
    const appUrl = new URL(req.url).origin;

    const { data: deal } = await admin
      .from("deals")
      .select("title")
      .eq("id", convo.deal_id)
      .single();

    // Send email + in-app notification to each recipient
    for (const recipientId of recipientIds) {
      const { data: recipientProfile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", recipientId)
        .single();

      if (recipientProfile?.email) {
        sendEmail({
          to: recipientProfile.email,
          subject: `New message from ${senderName}`,
          html: emailTemplate({
            title: "New Message",
            body: `<strong>${senderName}</strong> sent you a message${deal?.title ? ` about <strong>${deal.title}</strong>` : ""}.<br/><br/>"${content.slice(0, 200)}${content.length > 200 ? "..." : ""}"`,
            ctaText: "View Conversation",
            ctaUrl: `${appUrl}/messages/${id}`,
          }),
        }).catch((err: unknown) =>
          console.error("[email] message notification failed:", err)
        );
      }

      // In-app notification: message received
      sendNotification({
        userId: recipientId,
        type: "message_received",
        title: `New message from ${senderName}`,
        message: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
        link: `/messages/${id}`,
      }).catch(() => {});
    }

    // Also notify admins (unless sender is admin) so they have oversight
    if (!isAdmin) {
      sendAdminNotification({
        type: "message_received",
        title: `New message from ${senderName}`,
        message: `${senderName} sent a message${deal?.title ? ` about "${deal.title}"` : ""}: ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`,
        link: `/messages/${id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
