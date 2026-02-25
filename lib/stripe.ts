// ---------------------------------------------------------------------------
// Server-side Stripe helpers — DO NOT import in "use client" components
// ---------------------------------------------------------------------------

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeServer() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

// Alias for backward compat
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripeServer() as any)[prop];
  },
});

// ---- Create escrow PaymentIntent -------------------------------------------

export async function createEscrowPaymentIntent({
  amountInCents,
  investorEmail,
  investorId,
  dealId,
  commitmentId,
  dealTitle,
}: {
  amountInCents: number;
  investorEmail: string;
  investorId: string;
  dealId: string;
  commitmentId: string;
  dealTitle: string;
}) {
  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    receipt_email: investorEmail,
    metadata: {
      investor_id: investorId,
      deal_id: dealId,
      commitment_id: commitmentId,
      deal_title: dealTitle,
      type: "escrow_deposit",
    },
    description: `Investment commitment — ${dealTitle}`,
  });
}

// ---- Refund a PaymentIntent ------------------------------------------------

export async function refundPayment({
  paymentIntentId,
  amountInCents,
  reason,
}: {
  paymentIntentId: string;
  amountInCents?: number;
  reason?: string;
}) {
  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
  };

  if (amountInCents) params.amount = amountInCents;
  if (reason) params.metadata = { reason };

  return stripe.refunds.create(params);
}
