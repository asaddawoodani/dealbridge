import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, formatCurrency, ADMIN_EMAIL } from "@/lib/email";

// Disable Next.js body parsing — we need the raw body for Stripe signature verification
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe webhook] signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const commitmentId = pi.metadata.commitment_id;

        // Update escrow transaction
        await admin
          .from("escrow_transactions")
          .update({
            payment_status: "succeeded",
            status: "completed",
            paid_at: new Date().toISOString(),
            payment_method: pi.payment_method_types?.[0] ?? "card",
            stripe_receipt_url: pi.latest_charge
              ? (typeof pi.latest_charge === "string" ? null : null)
              : null,
          })
          .eq("stripe_payment_intent_id", pi.id);

        // Update commitment
        if (commitmentId) {
          await admin
            .from("investment_commitments")
            .update({
              funding_status: "funded",
              status: "funded",
              funded_date: new Date().toISOString(),
            })
            .eq("id", commitmentId);

          // Recalculate deal total_committed (trigger handles this, but be safe)
          const { data: commitment } = await admin
            .from("investment_commitments")
            .select("deal_id, investor_id, amount, deals(title)")
            .eq("id", commitmentId)
            .single();

          if (commitment) {
            // Send payment confirmation email
            const { data: profile } = await admin
              .from("profiles")
              .select("email, full_name")
              .eq("id", commitment.investor_id)
              .single();

            const deal = commitment.deals as unknown as { title: string } | null;

            if (profile?.email) {
              const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dealbridge.io";
              sendEmail({
                to: profile.email,
                subject: `Payment confirmed: ${formatCurrency(commitment.amount)} for ${deal?.title ?? "Deal"}`,
                html: emailTemplate({
                  title: "Payment Confirmed",
                  body: [
                    `Your payment of <strong>${formatCurrency(commitment.amount)}</strong> for <strong>${deal?.title ?? "a deal"}</strong> has been received.`,
                    "",
                    "Your funds are now held securely in escrow. You'll be notified when the funds are released to the operator.",
                  ].join("<br/>"),
                  ctaText: "View Portfolio",
                  ctaUrl: `${origin}/portfolio`,
                }),
              }).catch((err: unknown) => console.error("[email] payment confirmation failed:", err));
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const commitmentId = pi.metadata.commitment_id;

        await admin
          .from("escrow_transactions")
          .update({ payment_status: "failed", status: "failed" })
          .eq("stripe_payment_intent_id", pi.id);

        if (commitmentId) {
          await admin
            .from("investment_commitments")
            .update({ funding_status: "unfunded" })
            .eq("id", commitmentId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (piId) {
          const isFullRefund = charge.amount_refunded === charge.amount;

          await admin
            .from("escrow_transactions")
            .update({
              payment_status: isFullRefund ? "refunded" : "partially_refunded",
              refunded_at: new Date().toISOString(),
              refund_amount: charge.amount_refunded / 100,
            })
            .eq("stripe_payment_intent_id", piId);

          // Find commitment via escrow
          const { data: escrow } = await admin
            .from("escrow_transactions")
            .select("commitment_id")
            .eq("stripe_payment_intent_id", piId)
            .single();

          if (escrow?.commitment_id && isFullRefund) {
            await admin
              .from("investment_commitments")
              .update({ funding_status: "refunded", status: "cancelled" })
              .eq("id", escrow.commitment_id);

            // Send refund email
            const { data: commitment } = await admin
              .from("investment_commitments")
              .select("investor_id, amount, deals(title)")
              .eq("id", escrow.commitment_id)
              .single();

            if (commitment) {
              const { data: profile } = await admin
                .from("profiles")
                .select("email")
                .eq("id", commitment.investor_id)
                .single();

              const deal = commitment.deals as unknown as { title: string } | null;

              if (profile?.email) {
                const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dealbridge.io";
                sendEmail({
                  to: profile.email,
                  subject: `Refund processed: ${deal?.title ?? "Deal"}`,
                  html: emailTemplate({
                    title: "Refund Processed",
                    body: [
                      `Your payment of <strong>${formatCurrency(commitment.amount)}</strong> for <strong>${deal?.title ?? "a deal"}</strong> has been refunded.`,
                      "",
                      "The refund should appear in your account within 5-10 business days.",
                    ].join("<br/>"),
                    ctaText: "View Portfolio",
                    ctaUrl: `${origin}/portfolio`,
                  }),
                }).catch((err: unknown) => console.error("[email] refund notification failed:", err));
              }
            }
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        console.error("[stripe webhook] dispute created:", dispute.id);

        sendEmail({
          to: ADMIN_EMAIL,
          subject: `Payment dispute opened — ${dispute.id}`,
          html: emailTemplate({
            title: "Payment Dispute Alert",
            body: [
              `A payment dispute has been opened.`,
              `<strong>Dispute ID:</strong> ${dispute.id}`,
              `<strong>Amount:</strong> ${formatCurrency(dispute.amount / 100)}`,
              `<strong>Reason:</strong> ${dispute.reason ?? "Unknown"}`,
              "",
              "Please review this dispute in the Stripe Dashboard immediately.",
            ].join("<br/>"),
            ctaText: "Open Stripe Dashboard",
            ctaUrl: "https://dashboard.stripe.com/disputes",
          }),
        }).catch((err: unknown) => console.error("[email] dispute alert failed:", err));
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err: unknown) {
    console.error("[stripe webhook] processing error:", err);
    // Still return 200 to prevent Stripe retries
  }

  return NextResponse.json({ received: true });
}
