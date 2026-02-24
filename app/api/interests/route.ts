import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, ADMIN_EMAIL } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

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

    // Look up deal title for emails
    const appUrl = new URL(req.url).origin;
    const investorEmail = email ?? user.email!;
    const investorName = name ?? "An investor";

    Promise.resolve(
      admin
        .from("deals")
        .select("id, title")
        .eq("id", deal_id)
        .single()
    )
      .then(({ data: deal }) => {
        const dealTitle = deal?.title ?? "a deal";
        const dealUrl = `${appUrl}/deals/${deal_id}`;

        // Trigger 3: confirmation to investor
        sendEmail({
          to: investorEmail,
          subject: "Your intro request was sent",
          html: emailTemplate({
            title: "Intro Request Sent",
            body: `Your request for an introduction on <strong>${dealTitle}</strong> has been submitted. We'll be in touch soon.`,
            ctaText: "View Deal",
            ctaUrl: dealUrl,
          }),
        }).catch((err: unknown) =>
          console.error("[email] interest confirmation failed:", err)
        );

        // Trigger 4: admin notification
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
      })
      .catch((err: unknown) =>
        console.error("[email] deal lookup failed:", err)
      );

    return NextResponse.json({ ok: true, interest: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
