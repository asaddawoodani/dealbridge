"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { useTheme } from "next-themes";
import { CheckCircle, Loader2 } from "lucide-react";

const darkAppearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#14b8a6",
    colorBackground: "#1e293b",
    colorText: "#f1f5f9",
    colorDanger: "#ef4444",
    fontFamily: "inherit",
    borderRadius: "8px",
  },
};

const lightAppearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0d9488",
    colorBackground: "#ffffff",
    colorText: "#0f172a",
    colorDanger: "#dc2626",
    fontFamily: "inherit",
    borderRadius: "8px",
  },
};

function CheckoutForm({
  amount,
  onSuccess,
}: {
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/portfolio`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setProcessing(false);
    } else {
      setSucceeded(true);
      setProcessing(false);
      onSuccess();
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
        <div className="text-lg font-semibold">Payment Successful</div>
        <p className="text-sm text-[--text-secondary]">
          Your funds are now held securely in escrow.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />

      {error && (
        <div className="text-sm rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className={[
          "w-full rounded-xl px-6 py-3 font-semibold transition-all text-sm flex items-center justify-center gap-2",
          !stripe || processing
            ? "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
            : "bg-teal-500 text-white hover:bg-teal-600",
        ].join(" ")}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${amount.toLocaleString()}`
        )}
      </button>
    </form>
  );
}

export default function PaymentForm({
  clientSecret,
  amount,
  onSuccess,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const appearance = resolvedTheme === "light" ? lightAppearance : darkAppearance;

  return (
    <Elements
      key={resolvedTheme}
      stripe={getStripe()}
      options={{ clientSecret, appearance }}
    >
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}
