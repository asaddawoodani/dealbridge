import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, ADMIN_EMAIL, parseCheckToNumber } from "@/lib/email";
import { sendNotification, sendAdminNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enforce verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("id", user.id)
      .single();

    if (profile?.verification_status !== "verified") {
      return NextResponse.json(
        { error: "Account verification required before requesting introductions." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // KYC check for high-value deals (>= $100K min check)
    const deal_id_for_kyc = String(body?.deal_id ?? "").trim();
    if (deal_id_for_kyc) {
      const admin = createAdminClient();
      const { data: dealForKyc } = await admin
        .from("deals")
        .select("min_check")
        .eq("id", deal_id_for_kyc)
        .single();

      const minCheck = parseCheckToNumber(dealForKyc?.min_check ?? null);
      if (minCheck !== null && minCheck >= 100_000) {
        const { data: kycProfile } = await admin
          .from("profiles")
          .select("kyc_status")
          .eq("id", user.id)
          .single();

        if (kycProfile?.kyc_status !== "approved") {
          return NextResponse.json(
            { error: "KYC verification required for deals with minimum check sizes of $100K or more." },
            { status: 403 }
          );
        }
      }
    }

    const deal_id = String(body?.deal_id ?? "").trim();
    const name = body?.name ? String(body.name).trim() : null;
    const email = body?.email ? String(body.email).trim() : null;
    const message = body?.message ? String(body.message).trim() : null;

    if (!deal_id) {
      return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
    }

    if (email && !email.includes("@")) {
      return NextResponse.json({ error: "email looks invalid" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent");
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("deal_interests")
      .insert({
        deal_id,
        name,
        email,
        message,
        user_agent: ua,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Look up deal for emails and conversation creation
    const appUrl = new URL(req.url).origin;
    const investorEmail = email ?? user.email!;
    const investorName = name ?? "An investor";

    // Create conversation + first message
    let conversationId: string | null = null;
    try {
      const { data: deal } = await admin
        .from("deals")
        .select("id, title, operator_id")
        .eq("id", deal_id)
        .single();

      const dealTitle = deal?.title ?? "a deal";
      const dealUrl = `${appUrl}/deals/${deal_id}`;

      if (deal?.operator_id && deal.operator_id !== user.id) {
        // Check for existing conversation
        const { data: existing } = await admin
          .from("conversations")
          .select("id")
          .eq("deal_id", deal_id)
          .eq("investor_id", user.id)
          .maybeSingle();

        if (existing) {
          conversationId = existing.id;
        } else {
          const { data: convo } = await admin
            .from("conversations")
            .insert({
              deal_id,
              investor_id: user.id,
              operator_id: deal.operator_id,
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          conversationId = convo?.id ?? null;
        }

        // Insert intro message into conversation
        if (conversationId) {
          const introContent = [
            `Hi, I'm interested in ${dealTitle}.`,
            message || "",
          ]
            .filter(Boolean)
            .join("\n\n");

          await admin.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: introContent,
          });

          // Update last_message_at
          await admin
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversationId);
        }

        // Email operator about new conversation
        if (conversationId) {
          const { data: operatorProfile } = await admin
            .from("profiles")
            .select("email")
            .eq("id", deal.operator_id)
            .single();

          if (operatorProfile?.email) {
            sendEmail({
              to: operatorProfile.email,
              subject: `New message from ${investorName} about ${dealTitle}`,
              html: emailTemplate({
                title: "New Investor Introduction",
                body: [
                  `<strong>${investorName}</strong> is interested in <strong>${dealTitle}</strong>.`,
                  message ? `<br/><br/>"${message.slice(0, 300)}${message.length > 300 ? "..." : ""}"` : "",
                ].filter(Boolean).join(""),
                ctaText: "View Conversation",
                ctaUrl: `${appUrl}/messages/${conversationId}`,
              }),
            }).catch((err: unknown) =>
              console.error("[email] operator conversation notification failed:", err)
            );
          }
        }
      }

      // Confirmation to investor
      sendEmail({
        to: investorEmail,
        subject: "Your intro request was sent",
        html: emailTemplate({
          title: "Intro Request Sent",
          body: `Your request for an introduction on <strong>${dealTitle}</strong> has been submitted.${conversationId ? " You can now message the operator directly." : " We'll be in touch soon."}`,
          ctaText: conversationId ? "View Conversation" : "View Deal",
          ctaUrl: conversationId ? `${appUrl}/messages/${conversationId}` : dealUrl,
        }),
      }).catch((err: unknown) =>
        console.error("[email] interest confirmation failed:", err)
      );

      // Admin notification
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New intro request: ${dealTitle}`,
        html: emailTemplate({
          title: "New Intro Request",
          body: [
            `<strong>Investor:</strong> ${investorName}`,
            `<strong>Email:</strong> ${investorEmail}`,
            `<strong>Deal:</strong> ${dealTitle}`,
            message ? `<strong>Message:</strong> ${message}` : "",
          ]
            .filter(Boolean)
            .join("<br/>"),
          ctaText: "View Deal",
          ctaUrl: dealUrl,
        }),
      }).catch((err: unknown) =>
        console.error("[email] admin notification failed:", err)
      );

      // In-app notification: notify operator about new intro
      if (deal?.operator_id && deal.operator_id !== user.id) {
        sendNotification({
          userId: deal.operator_id,
          type: "deal_match",
          title: "New investor introduction",
          message: `${investorName} is interested in "${dealTitle}".`,
          link: conversationId ? `/messages/${conversationId}` : `/deals/${deal_id}`,
        }).catch(() => {});
      }

      // In-app notification: notify admins about new application
      sendAdminNotification({
        type: "admin_new_application",
        title: "New intro request",
        message: `${investorName} requested an intro on "${dealTitle}".`,
        link: `/admin/deals`,
      }).catch(() => {});
    } catch (err: unknown) {
      console.error("[messaging] conversation creation failed:", err);
    }

    return NextResponse.json({ ok: true, interest: data, conversationId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
