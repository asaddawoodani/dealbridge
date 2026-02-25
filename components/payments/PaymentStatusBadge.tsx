"use client";

const BADGE_STYLES: Record<string, string> = {
  unfunded: "border-gray-500/30 text-gray-400 bg-gray-500/10",
  pending_payment: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  funded: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  released: "border-teal-500/30 text-teal-400 bg-teal-500/10",
  refunded: "border-red-500/30 text-red-400 bg-red-500/10",
};

const LABELS: Record<string, string> = {
  unfunded: "Unfunded",
  pending_payment: "Payment Pending",
  funded: "Funded",
  released: "Released",
  refunded: "Refunded",
};

export default function PaymentStatusBadge({
  status,
}: {
  status: string | null;
}) {
  const s = status ?? "unfunded";
  return (
    <span
      className={[
        "text-xs px-2 py-1 rounded-full border font-medium",
        BADGE_STYLES[s] ?? BADGE_STYLES.unfunded,
      ].join(" ")}
    >
      {LABELS[s] ?? s}
    </span>
  );
}
