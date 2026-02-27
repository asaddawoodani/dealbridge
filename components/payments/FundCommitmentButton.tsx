"use client";

import { useState } from "react";
import { DollarSign, X, Loader2 } from "lucide-react";
import PaymentForm from "./PaymentForm";
import PaymentStatusBadge from "./PaymentStatusBadge";

export default function FundCommitmentButton({
  commitmentId,
  amount,
  fundingStatus,
  onFunded,
}: {
  commitmentId: string;
  amount: number;
  fundingStatus: string | null;
  onFunded?: () => void;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = fundingStatus ?? "unfunded";
  const canFund = status === "unfunded" || status === "pending_payment";

  const handleClick = async () => {
    if (!canFund) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitmentId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error ?? "Failed to create payment");
        setLoading(false);
        return;
      }

      setClientSecret(json.clientSecret);
      setShowPayment(true);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const handleSuccess = () => {
    setTimeout(() => {
      setShowPayment(false);
      onFunded?.();
    }, 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <PaymentStatusBadge status={status} />

        {canFund && (
          <button
            onClick={handleClick}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-500/30 text-sm text-teal-400 hover:bg-teal-500/10 transition font-medium"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <DollarSign className="h-3.5 w-3.5" />
            )}
            {loading ? "Loading..." : "Fund"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}

      {/* Payment modal */}
      {showPayment && clientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl border border-slate-700 p-6 shadow-xl"
            style={{ backgroundColor: '#0f172a' }}
          >
            <button
              onClick={() => setShowPayment(false)}
              className="absolute top-4 right-4 text-[--text-muted] hover:text-[--text-primary] transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <div className="text-lg font-semibold">Fund Commitment</div>
              <div className="text-sm text-[--text-secondary] mt-1">
                Securely pay ${amount.toLocaleString()} via Stripe
              </div>
            </div>

            <PaymentForm
              clientSecret={clientSecret}
              amount={amount}
              onSuccess={handleSuccess}
            />

            <div className="text-[11px] text-[--text-muted] mt-4 text-center">
              Funds are held in escrow until released by the platform.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
