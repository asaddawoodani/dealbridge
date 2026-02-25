import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await Promise.resolve(params);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch the KYC submission
    const { data: submission, error: fetchError } = await admin
      .from("kyc_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: "KYC submission not found" }, { status: 404 });
    }

    // Fetch profile separately (user_id FKs to auth.users, not profiles)
    const { data: userProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", submission.user_id)
      .single();

    const newStatus = action === "approve" ? "approved" : "rejected";
    const rejectionReason =
      action === "reject"
        ? String(body.rejection_reason ?? "").trim() || null
        : null;
    const riskLevel =
      action === "approve"
        ? String(body.risk_level ?? "low").trim()
        : null;

    // Update KYC submission
    const updateData: Record<string, unknown> = {
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    };

    if (action === "approve") {
      updateData.risk_level = ["low", "medium", "high"].includes(riskLevel ?? "")
        ? riskLevel
        : "low";
      // Expires 1 year from now
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      updateData.expires_at = expires.toISOString();
    }

    const { error: updateError } = await admin
      .from("kyc_submissions")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Update profile kyc_status
    await admin
      .from("profiles")
      .update({ kyc_status: newStatus })
      .eq("id", submission.user_id);

    // Email user
    const appUrl = new URL(req.url).origin;
    const userEmail = userProfile?.email;
    const userName = userProfile?.full_name ?? "there";

    if (userEmail) {
      if (action === "approve") {
        sendEmail({
          to: userEmail,
          subject: "Your KYC verification has been approved",
          html: emailTemplate({
            title: "KYC Approved",
            body: `Congratulations ${userName}! Your KYC verification has been approved. You now have full access to all deals on the platform.`,
            ctaText: "Browse Deals",
            ctaUrl: `${appUrl}/deals`,
          }),
        }).catch((err: unknown) =>
          console.error("[email] KYC approval email failed:", err)
        );
      } else {
        sendEmail({
          to: userEmail,
          subject: "Your KYC verification was not approved",
          html: emailTemplate({
            title: "KYC Not Approved",
            body: [
              `Hi ${userName}, unfortunately your KYC submission was not approved.`,
              rejectionReason ? `<strong>Reason:</strong> ${rejectionReason}` : "",
              "You can resubmit your KYC with updated information.",
            ]
              .filter(Boolean)
              .join("<br/><br/>"),
            ctaText: "Resubmit KYC",
            ctaUrl: `${appUrl}/kyc`,
          }),
        }).catch((err: unknown) =>
          console.error("[email] KYC rejection email failed:", err)
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
