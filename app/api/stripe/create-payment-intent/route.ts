import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEscrowPaymentIntent } from "@/lib/stripe";

// POST — Create a Stripe PaymentIntent for an investment commitment
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { commitmentId } = await req.json();

    if (!commitmentId) {
      return NextResponse.json({ error: "commitmentId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch commitment with deal info
    const { data: commitment, error: cErr } = await admin
      .from("investment_commitments")
      .select("*, deals(id, title)")
      .eq("id", commitmentId)
      .single();

    if (cErr || !commitment) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Must belong to this investor
    if (commitment.investor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Must not already be funded
    if (commitment.funding_status === "funded") {
      return NextResponse.json({ error: "Commitment already funded" }, { status: 400 });
    }

    // Check for existing pending escrow transaction — return existing clientSecret
    if (commitment.escrow_transaction_id) {
      const { data: existingEscrow } = await admin
        .from("escrow_transactions")
        .select("stripe_client_secret, payment_status")
        .eq("id", commitment.escrow_transaction_id)
        .single();

      if (existingEscrow && existingEscrow.payment_status === "pending") {
        return NextResponse.json({ clientSecret: existingEscrow.stripe_client_secret });
      }
    }

    // Fetch investor profile for email
    const { data: investorProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const deal = commitment.deals as { id: string; title: string } | null;
    const amountInCents = Math.round(commitment.amount * 100);

    // Create Stripe PaymentIntent
    const paymentIntent = await createEscrowPaymentIntent({
      amountInCents,
      investorEmail: investorProfile?.email ?? user.email ?? "",
      investorId: user.id,
      dealId: deal?.id ?? commitment.deal_id,
      commitmentId,
      dealTitle: deal?.title ?? "Deal",
    });

    // Insert escrow transaction
    const { data: escrow, error: escrowErr } = await admin
      .from("escrow_transactions")
      .insert({
        commitment_id: commitmentId,
        type: "deposit",
        amount: commitment.amount,
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (escrowErr) {
      return NextResponse.json({ error: escrowErr.message }, { status: 500 });
    }

    // Link escrow to commitment and update funding status
    await admin
      .from("investment_commitments")
      .update({
        escrow_transaction_id: escrow.id,
        funding_status: "pending_payment",
      })
      .eq("id", commitmentId);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[stripe] create-payment-intent error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
