import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function KycBanner({ kycStatus }: { kycStatus: string }) {
  if (kycStatus === "approved") return null;

  const messages: Record<string, { title: string; body: string }> = {
    none: {
      title: "KYC Verification Required",
      body: "This deal requires identity verification (KYC) before you can request an introduction or access documents.",
    },
    pending: {
      title: "KYC Under Review",
      body: "Your KYC submission is being reviewed by our compliance team. You'll be notified once it's approved.",
    },
    rejected: {
      title: "KYC Verification Rejected",
      body: "Your KYC submission was not approved. Please resubmit with updated information.",
    },
    expired: {
      title: "KYC Verification Expired",
      body: "Your KYC verification has expired. Please submit a new application.",
    },
  };

  const msg = messages[kycStatus] ?? messages.none;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-semibold text-amber-400">{msg.title}</div>
          <div className="text-sm text-[--text-secondary] mt-1">{msg.body}</div>
          {kycStatus !== "pending" && (
            <Link
              href="/kyc"
              className="inline-block mt-3 text-sm font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4"
            >
              {kycStatus === "rejected" || kycStatus === "expired"
                ? "Resubmit KYC"
                : "Complete KYC Verification"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
