"use client";

import Link from "next/link";
import { DollarSign, LogIn, ShieldAlert, ShieldCheck } from "lucide-react";

export default function InvestButton({
  dealId,
  dealMinCheck,
  verificationStatus,
  kycStatus,
}: {
  dealId: string;
  dealMinCheck: string | null;
  verificationStatus: string | null;
  kycStatus: string | null;
}) {
  // Parse min check to determine if high-value
  const isHighValue = (() => {
    if (!dealMinCheck) return false;
    const cleaned = dealMinCheck.replace(/[$,\s]/g, "").toLowerCase();
    const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m)?/);
    if (!match) return false;
    let num = parseFloat(match[1]);
    if (match[2] === "k") num *= 1_000;
    if (match[2] === "m") num *= 1_000_000;
    return num >= 100_000;
  })();

  // Not logged in
  if (verificationStatus === null) {
    return (
      <Link
        href="/auth/login"
        className="w-full rounded-xl bg-[--bg-elevated] text-[--text-secondary] px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[--bg-input] transition-all"
      >
        <LogIn className="h-4 w-4" />
        Log in to invest
      </Link>
    );
  }

  // Not verified
  if (verificationStatus !== "verified") {
    return (
      <Link
        href="/verify"
        className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
      >
        <ShieldAlert className="h-4 w-4" />
        Verify account first
      </Link>
    );
  }

  // High-value deal and not KYC approved
  if (isHighValue && kycStatus !== "approved") {
    return (
      <Link
        href="/kyc"
        className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
      >
        <ShieldCheck className="h-4 w-4" />
        Complete KYC
      </Link>
    );
  }

  // Ready to invest
  return (
    <Link
      href={`/invest/${dealId}`}
      className="w-full rounded-xl bg-teal-500 text-white px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-teal-600 transition-all"
    >
      <DollarSign className="h-4 w-4" />
      Commit to Invest
    </Link>
  );
}
