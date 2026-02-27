import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate } from "@/lib/email";
import { sendNotification } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interestId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the interest
    const { data: interest } = await admin
      .from("deal_interests")
      .select("id, deal_id, user_id, status")
      .eq("id", interestId)
      .single();

    if (!interest) {
      return NextResponse.json({ error: "Interest not found" }, { status: 404 });
    }

    // Verify operator owns the deal
    const { data: deal } = await admin
      .from("deals")
      .select("id, title, operator_id")
      .eq("id", interest.deal_id)
      .single();

    if (!deal || deal.operator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (interest.status !== "pending") {
      return NextResponse.json(
        { error: `Interest is already ${interest.status}` },
        { status: 400 }
      );
    }

    // Flip to accepted
    const { error: updateError } = await admin
      .from("deal_interests")
      .update({ status: "accepted" })
      .eq("id", interestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send notification to investor
    const appUrl = new URL(req.url).origin;

    sendNotification({
      userId: interest.user_id,
      type: "intro_accepted",
      title: "Introduction accepted!",
      message: `Your introduction to "${deal.title}" has been accepted. You can now message the operator.`,
      link: `/messages`,
    }).catch(() => {});

    // Send email to investor
    const { data: investorProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", interest.user_id)
      .single();

    if (investorProfile?.email) {
      sendEmail({
        to: investorProfile.email,
        subject: `Your introduction to ${deal.title} was accepted`,
        html: emailTemplate({
          title: "Introduction Accepted",
          body: `Great news! The operator of <strong>${deal.title}</strong> has accepted your introduction request. You can now communicate directly.`,
          ctaText: "View Messages",
          ctaUrl: `${appUrl}/messages`,
        }),
      }).catch((err: unknown) =>
        console.error("[email] intro accepted notification failed:", err)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
