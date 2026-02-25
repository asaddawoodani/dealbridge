import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundPayment } from "@/lib/stripe";

// POST — Admin-only: refund an escrow payment
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const { escrowTransactionId, amountInCents } = await req.json();

    if (!escrowTransactionId) {
      return NextResponse.json({ error: "escrowTransactionId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: escrow, error: escrowErr } = await admin
      .from("escrow_transactions")
      .select("stripe_payment_intent_id, payment_status, amount")
      .eq("id", escrowTransactionId)
      .single();

    if (escrowErr || !escrow) {
      return NextResponse.json({ error: "Escrow transaction not found" }, { status: 404 });
    }

    if (!escrow.stripe_payment_intent_id) {
      return NextResponse.json({ error: "No Stripe payment to refund" }, { status: 400 });
    }

    if (escrow.payment_status !== "succeeded") {
      return NextResponse.json({ error: "Payment must be succeeded to refund" }, { status: 400 });
    }

    const refund = await refundPayment({
      paymentIntentId: escrow.stripe_payment_intent_id,
      amountInCents: amountInCents || undefined,
    });

    // The webhook will handle DB updates when Stripe confirms the refund
    return NextResponse.json({ ok: true, refundId: refund.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[stripe] refund error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
