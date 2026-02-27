import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, ADMIN_EMAIL } from "@/lib/email";
import { sendAdminNotification } from "@/lib/notifications";
import crypto from "crypto";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const [{ data: submission }, { data: profile }] = await Promise.all([
      admin
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("kyc_status")
        .eq("id", user.id)
        .single(),
    ]);

    return NextResponse.json({
      kyc_status: profile?.kyc_status ?? "none",
      submission: submission ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check if already pending/approved
    const { data: profile } = await admin
      .from("profiles")
      .select("kyc_status, full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.kyc_status === "pending") {
      return NextResponse.json(
        { error: "You already have a pending KYC submission." },
        { status: 400 }
      );
    }

    if (profile?.kyc_status === "approved") {
      return NextResponse.json(
        { error: "Your KYC is already approved." },
        { status: 400 }
      );
    }

    const formData = await req.formData();

    // Required fields
    const fullLegalName = String(formData.get("full_legal_name") ?? "").trim();
    const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();
    const nationality = String(formData.get("nationality") ?? "").trim();
    const addressLine1 = String(formData.get("address_line1") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const stateProvince = String(formData.get("state_province") ?? "").trim();
    const postalCode = String(formData.get("postal_code") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();
    const idDocumentType = String(formData.get("id_document_type") ?? "").trim();
    const sourceOfFunds = String(formData.get("source_of_funds") ?? "").trim();
    const termsAccepted = formData.get("terms_accepted") === "true";
    const declarationSigned = formData.get("declaration_signed") === "true";

    if (
      !fullLegalName ||
      !dateOfBirth ||
      !nationality ||
      !addressLine1 ||
      !city ||
      !stateProvince ||
      !postalCode ||
      !country ||
      !idDocumentType ||
      !sourceOfFunds
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!termsAccepted || !declarationSigned) {
      return NextResponse.json(
        { error: "You must accept the terms and sign the declaration" },
        { status: 400 }
      );
    }

    // Validate ID document type
    if (!["passport", "drivers_license", "national_id"].includes(idDocumentType)) {
      return NextResponse.json(
        { error: "Invalid ID document type" },
        { status: 400 }
      );
    }

    // Validate source of funds
    if (!["employment", "business", "investments", "inheritance", "other"].includes(sourceOfFunds)) {
      return NextResponse.json(
        { error: "Invalid source of funds" },
        { status: 400 }
      );
    }

    // Upload ID document
    const idDocFile = formData.get("id_document") as File | null;
    if (!idDocFile) {
      return NextResponse.json(
        { error: "ID document is required" },
        { status: 400 }
      );
    }

    const ext = idDocFile.name.split(".").pop() ?? "pdf";
    const docPath = `${user.id}/${Date.now()}-id.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from("kyc-documents")
      .upload(docPath, idDocFile, { contentType: idDocFile.type });

    if (uploadErr) {
      return NextResponse.json(
        { error: `Document upload failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    // Optional selfie upload
    let selfiePath: string | null = null;
    const selfieFile = formData.get("selfie") as File | null;
    if (selfieFile) {
      const selfieExt = selfieFile.name.split(".").pop() ?? "jpg";
      selfiePath = `${user.id}/${Date.now()}-selfie.${selfieExt}`;
      await admin.storage
        .from("kyc-documents")
        .upload(selfiePath, selfieFile, { contentType: selfieFile.type });
    }

    // Hash tax ID if provided
    const taxIdRaw = String(formData.get("tax_id") ?? "").trim();
    const taxIdType = String(formData.get("tax_id_type") ?? "").trim() || null;
    const taxIdHash = taxIdRaw
      ? crypto.createHash("sha256").update(taxIdRaw).digest("hex")
      : null;

    // Optional fields
    const addressLine2 = String(formData.get("address_line2") ?? "").trim() || null;
    const sourceDetails = String(formData.get("source_details") ?? "").trim() || null;
    const expectedRange = String(formData.get("expected_investment_range") ?? "").trim() || null;
    const pepStatus = formData.get("pep_status") === "true";
    const pepDetails = String(formData.get("pep_details") ?? "").trim() || null;

    // Insert KYC submission
    const { data: submission, error: insertErr } = await admin
      .from("kyc_submissions")
      .insert({
        user_id: user.id,
        full_legal_name: fullLegalName,
        date_of_birth: dateOfBirth,
        nationality,
        tax_id_type: taxIdType,
        tax_id_hash: taxIdHash,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state_province: stateProvince,
        postal_code: postalCode,
        country,
        id_document_type: idDocumentType,
        id_document_path: docPath,
        selfie_path: selfiePath,
        source_of_funds: sourceOfFunds,
        source_details: sourceDetails,
        expected_investment_range: expectedRange,
        pep_status: pepStatus,
        pep_details: pepDetails,
        terms_accepted: termsAccepted,
        declaration_signed: declarationSigned,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 400 }
      );
    }

    // Update profile kyc_status
    await admin
      .from("profiles")
      .update({ kyc_status: "pending" })
      .eq("id", user.id);

    // Email admin
    const appUrl = new URL(req.url).origin;
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New KYC submission from ${fullLegalName}`,
      html: emailTemplate({
        title: "New KYC Submission",
        body: [
          `<strong>Name:</strong> ${fullLegalName}`,
          `<strong>Email:</strong> ${profile?.email ?? user.email}`,
          `<strong>Nationality:</strong> ${nationality}`,
          `<strong>Source of Funds:</strong> ${sourceOfFunds}`,
        ].join("<br/>"),
        ctaText: "Review in Compliance Dashboard",
        ctaUrl: `${appUrl}/admin/compliance`,
      }),
    }).catch((err: unknown) =>
      console.error("[email] KYC admin notification failed:", err)
    );

    // Email user confirmation
    sendEmail({
      to: profile?.email ?? user.email!,
      subject: "KYC submission received",
      html: emailTemplate({
        title: "KYC Submission Received",
        body: "Your KYC documents have been submitted successfully. Our compliance team will review your submission and you'll be notified once the review is complete.",
        ctaText: "Check Status",
        ctaUrl: `${appUrl}/kyc`,
      }),
    }).catch((err: unknown) =>
      console.error("[email] KYC user confirmation failed:", err)
    );

    // In-app notification: admin KYC submission
    sendAdminNotification({
      type: "admin_kyc_submission",
      title: "New KYC submission",
      message: `${fullLegalName} submitted KYC documents for review.`,
      link: "/admin/compliance",
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: submission?.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
