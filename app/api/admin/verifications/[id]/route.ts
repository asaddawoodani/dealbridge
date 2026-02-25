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

    // Fetch the verification request
    const { data: verification, error: fetchError } = await admin
      .from("verification_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !verification) {
      return NextResponse.json({ error: "Verification not found" }, { status: 404 });
    }

    // Fetch profile separately (user_id FKs to auth.users, not profiles)
    const { data: userProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", verification.user_id)
      .single();

    const newStatus = action === "approve" ? "approved" : "rejected";
    const rejectionReason = action === "reject" ? String(body.rejection_reason ?? "").trim() || null : null;

    // Update verification request
    const { error: updateError } = await admin
      .from("verification_requests")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Update profile verification_status
    const profileStatus = action === "approve" ? "verified" : "rejected";
    await admin
      .from("profiles")
      .update({ verification_status: profileStatus })
      .eq("id", verification.user_id);

    // Email user
    const appUrl = new URL(req.url).origin;
    const userEmail = userProfile?.email;
    const userName = userProfile?.full_name ?? "there";

    if (userEmail) {
      if (action === "approve") {
        sendEmail({
          to: userEmail,
          subject: "Your DealBridge account has been verified",
          html: emailTemplate({
            title: "Account Verified",
            body: `Congratulations ${userName}! Your account has been verified. You now have full access to the platform.`,
            ctaText: "Go to DealBridge",
            ctaUrl: appUrl,
          }),
        }).catch((err: unknown) =>
          console.error("[email] verification approval email failed:", err)
        );
      } else {
        sendEmail({
          to: userEmail,
          subject: "Your DealBridge verification was not approved",
          html: emailTemplate({
            title: "Verification Not Approved",
            body: [
              `Hi ${userName}, unfortunately your verification request was not approved.`,
              rejectionReason ? `<strong>Reason:</strong> ${rejectionReason}` : "",
              "You can resubmit your verification with updated information.",
            ]
              .filter(Boolean)
              .join("<br/><br/>"),
            ctaText: "Resubmit Verification",
            ctaUrl: `${appUrl}/${verification.role === "operator" ? "operator/verify" : "verify"}`,
          }),
        }).catch((err: unknown) =>
          console.error("[email] verification rejection email failed:", err)
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
