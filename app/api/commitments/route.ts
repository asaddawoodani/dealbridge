import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  emailTemplate,
  ADMIN_EMAIL,
  parseCheckToNumber,
  formatCurrency,
} from "@/lib/email";

// POST — Create a new investment commitment
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, verification_status, kyc_status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "investor" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Investor or admin role required" }, { status: 403 });
  }

  if (profile.verification_status !== "verified") {
    return NextResponse.json({ error: "Account verification required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { deal_id, amount, notes } = body;

    if (!deal_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Valid deal_id and amount > 0 required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch deal
    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id, title, status, min_check, target_raise, total_committed, operator_id")
      .eq("id", deal_id)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    if (deal.status !== "active") {
      return NextResponse.json({ error: "Deal is not active" }, { status: 400 });
    }

    // KYC check for high-value deals
    const minCheckNum = parseCheckToNumber(deal.min_check);
    if (minCheckNum !== null && minCheckNum >= 100_000 && profile.kyc_status !== "approved") {
      return NextResponse.json({ error: "KYC approval required for this deal" }, { status: 403 });
    }

    // Validate amount >= min_check
    if (minCheckNum !== null && amount < minCheckNum) {
      return NextResponse.json(
        { error: `Amount must be at least ${formatCurrency(minCheckNum)}` },
        { status: 400 }
      );
    }

    // Check for existing active commitment
    const { data: existing } = await admin
      .from("investment_commitments")
      .select("id")
      .eq("deal_id", deal_id)
      .eq("investor_id", user.id)
      .in("status", ["draft", "committed", "funded"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You already have an active commitment on this deal" }, { status: 409 });
    }

    // Insert commitment
    const { data: commitment, error: insertErr } = await admin
      .from("investment_commitments")
      .insert({
        deal_id,
        investor_id: user.id,
        amount: parseFloat(amount),
        status: "committed",
        notes: notes || null,
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    // Emails (fire and forget)
    const appUrl = new URL(req.url).origin;
    const formattedAmt = formatCurrency(parseFloat(amount));

    // 1. Investor confirmation
    const { data: investorProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (investorProfile?.email) {
      sendEmail({
        to: investorProfile.email,
        subject: `Investment commitment confirmed: ${deal.title}`,
        html: emailTemplate({
          title: "Commitment Confirmed",
          body: [
            `Your investment commitment of <strong>${formattedAmt}</strong> in <strong>${deal.title}</strong> has been recorded.`,
            "",
            "Next steps:",
            "1. Our team will review your commitment",
            "2. You'll receive funding instructions when ready",
            "3. Track your investments anytime in your portfolio",
          ].join("<br/>"),
          ctaText: "View Portfolio",
          ctaUrl: `${appUrl}/portfolio`,
        }),
      }).catch((err: unknown) => console.error("[email] investor commitment confirm failed:", err));
    }

    // 2. Operator notification
    if (deal.operator_id) {
      const { data: opProfile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", deal.operator_id)
        .single();

      if (opProfile?.email) {
        const newTotal = (deal.total_committed || 0) + parseFloat(amount);
        sendEmail({
          to: opProfile.email,
          subject: `New investment commitment on ${deal.title}`,
          html: emailTemplate({
            title: "New Investment Commitment",
            body: [
              `A new commitment of <strong>${formattedAmt}</strong> has been made on <strong>${deal.title}</strong>.`,
              `Total raised: <strong>${formatCurrency(newTotal)}</strong>`,
            ].join("<br/>"),
            ctaText: "View Dashboard",
            ctaUrl: `${appUrl}/operator/dashboard`,
          }),
        }).catch((err: unknown) => console.error("[email] operator commitment notify failed:", err));
      }
    }

    // 3. Admin flag for large commitments
    if (parseFloat(amount) >= 100_000) {
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Large commitment: ${formattedAmt} on ${deal.title}`,
        html: emailTemplate({
          title: "Large Investment Commitment",
          body: [
            `A commitment of <strong>${formattedAmt}</strong> has been made on <strong>${deal.title}</strong>.`,
            `Investor: ${investorProfile?.full_name ?? "Unknown"} (${investorProfile?.email ?? "Unknown"})`,
          ].join("<br/>"),
          ctaText: "Review in Admin",
          ctaUrl: `${appUrl}/admin/investments`,
        }),
      }).catch((err: unknown) => console.error("[email] admin large commitment flag failed:", err));
    }

    return NextResponse.json({ ok: true, commitment });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — List commitments for current user
export async function GET(req: Request) {
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

  const role = profile?.role ?? "investor";
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("deal_id");
  const status = searchParams.get("status");

  if (role === "investor") {
    let query = admin
      .from("investment_commitments")
      .select("*, deals(id, title, category, min_check, target_raise, total_committed)")
      .eq("investor_id", user.id)
      .order("created_at", { ascending: false });

    if (dealId) query = query.eq("deal_id", dealId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ commitments: data ?? [] });
  }

  if (role === "operator") {
    // Get operator's deal IDs first
    const { data: deals } = await admin
      .from("deals")
      .select("id")
      .eq("operator_id", user.id);

    const dealIds = deals?.map((d) => d.id) ?? [];
    if (dealIds.length === 0) {
      return NextResponse.json({ commitments: [] });
    }

    let query = admin
      .from("investment_commitments")
      .select("*, deals(id, title, category, min_check, target_raise, total_committed), profiles:investor_id(full_name, email)")
      .in("deal_id", dealIds)
      .order("created_at", { ascending: false });

    if (dealId) query = query.eq("deal_id", dealId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ commitments: data ?? [] });
  }

  if (role === "admin") {
    // By default return only the admin's own commitments (for portfolio).
    // Use ?all=true to get every commitment (admin oversight).
    const showAll = searchParams.get("all") === "true";

    let query = admin
      .from("investment_commitments")
      .select("*, deals(id, title, category, min_check, target_raise, total_committed), profiles:investor_id(full_name, email)")
      .order("created_at", { ascending: false });

    if (!showAll) query = query.eq("investor_id", user.id);
    if (dealId) query = query.eq("deal_id", dealId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ commitments: data ?? [] });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
