import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, ADMIN_EMAIL } from "@/lib/email";
import { sendAdminNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, verification_status")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.verification_status === "pending") {
      return NextResponse.json(
        { error: "You already have a pending verification request." },
        { status: 400 }
      );
    }

    if (profile.verification_status === "verified") {
      return NextResponse.json(
        { error: "You are already verified." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type as string;

    if (type !== "investor" && type !== "operator") {
      return NextResponse.json(
        { error: "type must be 'investor' or 'operator'" },
        { status: 400 }
      );
    }

    // Validate required fields based on type
    if (type === "investor") {
      const fullLegalName = String(body.full_legal_name ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const accreditationType = String(body.accreditation_type ?? "").trim();
      const selfCertified = Boolean(body.self_certified);

      if (!fullLegalName) {
        return NextResponse.json({ error: "Full legal name is required." }, { status: 400 });
      }
      if (!phone) {
        return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
      }
      if (!accreditationType) {
        return NextResponse.json({ error: "Accreditation type is required." }, { status: 400 });
      }
      if (!selfCertified) {
        return NextResponse.json({ error: "Self-certification is required." }, { status: 400 });
      }

      const admin = createAdminClient();

      const { error: insertError } = await admin
        .from("verification_requests")
        .insert({
          user_id: user.id,
          role: "investor",
          status: "pending",
          full_legal_name: fullLegalName,
          phone,
          accreditation_type: accreditationType,
          proof_description: String(body.proof_description ?? "").trim() || null,
          self_certified: selfCertified,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }

      await admin
        .from("profiles")
        .update({ verification_status: "pending" })
        .eq("id", user.id);

      const appUrl = new URL(req.url).origin;
      sendEmail({
        to: ADMIN_EMAIL,
        subject: "New investor verification request",
        html: emailTemplate({
          title: "Investor Verification Request",
          body: [
            `<strong>Name:</strong> ${fullLegalName}`,
            `<strong>Phone:</strong> ${phone}`,
            `<strong>Accreditation:</strong> ${accreditationType}`,
            body.proof_description ? `<strong>Proof:</strong> ${body.proof_description}` : "",
          ]
            .filter(Boolean)
            .join("<br/>"),
          ctaText: "Review Verifications",
          ctaUrl: `${appUrl}/admin/verifications`,
        }),
      }).catch((err: unknown) =>
        console.error("[email] verification notification failed:", err)
      );

      // In-app notification: admin verification request
      sendAdminNotification({
        type: "admin_verification_request",
        title: "New verification request",
        message: `Investor ${fullLegalName} submitted a verification request.`,
        link: "/admin/verifications",
      }).catch(() => {});

      return NextResponse.json({ ok: true });
    }

    // Operator verification
    const fullLegalName = String(body.full_legal_name ?? "").trim();
    const businessName = String(body.business_name ?? "").trim();
    const businessType = String(body.business_type ?? "").trim();
    const businessDescription = String(body.business_description ?? "").trim();

    if (!fullLegalName) {
      return NextResponse.json({ error: "Full legal name is required." }, { status: 400 });
    }
    if (!businessName) {
      return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    }
    if (!businessType) {
      return NextResponse.json({ error: "Business type is required." }, { status: 400 });
    }
    if (!businessDescription) {
      return NextResponse.json({ error: "Business description is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error: insertError } = await admin
      .from("verification_requests")
      .insert({
        user_id: user.id,
        role: "operator",
        status: "pending",
        full_legal_name: fullLegalName,
        business_name: businessName,
        business_type: businessType,
        ein_registration: String(body.ein_registration ?? "").trim() || null,
        business_address: String(body.business_address ?? "").trim() || null,
        business_description: businessDescription,
        years_in_operation: String(body.years_in_operation ?? "").trim() || null,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    await admin
      .from("profiles")
      .update({ verification_status: "pending" })
      .eq("id", user.id);

    const appUrl = new URL(req.url).origin;
    sendEmail({
      to: ADMIN_EMAIL,
      subject: "New operator verification request",
      html: emailTemplate({
        title: "Operator Verification Request",
        body: [
          `<strong>Name:</strong> ${fullLegalName}`,
          `<strong>Business:</strong> ${businessName}`,
          `<strong>Type:</strong> ${businessType}`,
          businessDescription ? `<strong>Description:</strong> ${businessDescription}` : "",
        ]
          .filter(Boolean)
          .join("<br/>"),
        ctaText: "Review Verifications",
        ctaUrl: `${appUrl}/admin/verifications`,
      }),
    }).catch((err: unknown) =>
      console.error("[email] verification notification failed:", err)
    );

    // In-app notification: admin verification request
    sendAdminNotification({
      type: "admin_verification_request",
      title: "New verification request",
      message: `Operator ${fullLegalName} (${businessName}) submitted a verification request.`,
      link: "/admin/verifications",
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
