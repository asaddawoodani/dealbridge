"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FundingProgress from "@/components/FundingProgress";
import { ArrowLeft, CheckCircle, Tag, MapPin, Wallet } from "lucide-react";

type Deal = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  min_check: string | null;
  target_raise: number | null;
  total_committed: number;
};

function parseCheckToNumber(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "").toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m)?/);
  if (!match) return null;
  let num = parseFloat(match[1]);
  if (match[2] === "k") num *= 1_000;
  if (match[2] === "m") num *= 1_000_000;
  return num;
}

function formatCurrencyInput(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US").format(num);
}

export default function InvestPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [gate, setGate] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [riskAck, setRiskAck] = useState(false);
  const [termsAck, setTermsAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      // Check auth + profile
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setGate("login");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, verification_status, kyc_status")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "investor") {
        setGate("role");
        setLoading(false);
        return;
      }

      if (profile.verification_status !== "verified") {
        setGate("verify");
        setLoading(false);
        return;
      }

      // Fetch deal
      const res = await fetch(`/api/deals/${dealId}`);
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.deal) {
        setGate("notfound");
        setLoading(false);
        return;
      }

      const d = json.deal as Deal;
      setDeal(d);

      // KYC check for high-value deals
      const minCheck = parseCheckToNumber(d.min_check);
      if (minCheck !== null && minCheck >= 100_000 && profile.kyc_status !== "approved") {
        setGate("kyc");
        setLoading(false);
        return;
      }

      setLoading(false);
    })();
  }, [dealId]);

  const rawAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
  const minCheck = deal ? parseCheckToNumber(deal.min_check) : null;
  const canSubmit = !submitting && rawAmount > 0 && riskAck && termsAck && (!minCheck || rawAmount >= minCheck);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deal_id: dealId,
        amount: rawAmount,
        notes: notes.trim() || null,
      }),
    });

    const json = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setError(json?.error ?? "Failed to submit commitment");
      return;
    }

    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl text-[--text-secondary]">Loading...</div>
      </div>
    );
  }

  if (gate) {
    const gateMessages: Record<string, { title: string; msg: string; link?: { href: string; label: string } }> = {
      login: { title: "Sign In Required", msg: "You need to log in to invest.", link: { href: "/auth/login", label: "Log In" } },
      role: { title: "Investor Access Only", msg: "Only investors can make commitments.", link: { href: "/dashboard", label: "Dashboard" } },
      verify: { title: "Verification Required", msg: "You need to verify your account before investing.", link: { href: "/verify", label: "Verify Account" } },
      kyc: { title: "KYC Required", msg: "This deal requires KYC approval due to its investment size.", link: { href: "/kyc", label: "Complete KYC" } },
      notfound: { title: "Deal Not Found", msg: "This deal doesn't exist or is no longer available.", link: { href: "/deals", label: "Browse Deals" } },
    };
    const g = gateMessages[gate] ?? gateMessages.notfound;

    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold">{g.title}</h1>
            <p className="text-[--text-secondary]">{g.msg}</p>
            {g.link && (
              <Link
                href={g.link.href}
                className="inline-block rounded-xl bg-teal-500 text-white px-5 py-3 font-semibold hover:bg-teal-600 transition-all text-sm"
              >
                {g.link.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-bold">Commitment Confirmed</h1>
            <p className="text-[--text-secondary]">
              Your investment commitment of <strong>${formatCurrencyInput(amount)}</strong> in{" "}
              <strong>{deal?.title}</strong> has been recorded.
            </p>
            <p className="text-sm text-[--text-muted]">
              You'll receive a confirmation email shortly. Our team will follow up with next steps.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                href="/portfolio"
                className="rounded-xl bg-teal-500 text-white px-5 py-3 font-semibold hover:bg-teal-600 transition-all text-sm"
              >
                View Portfolio
              </Link>
              <Link
                href={`/deals/${dealId}`}
                className="rounded-xl border border-[--border] px-5 py-3 font-semibold hover:border-[--border-hover] transition-all text-sm"
              >
                Back to Deal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href={`/deals/${dealId}`}
          className="text-[--text-muted] hover:text-[--text-primary] flex items-center gap-1.5 text-sm transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to deal
        </Link>

        <h1 className="text-3xl font-bold mb-2">Invest in {deal?.title}</h1>
        <p className="text-[--text-secondary] mb-8">Review the deal and submit your commitment.</p>

        {/* Deal summary */}
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-5 mb-6 space-y-4">
          <div className="font-semibold text-lg">{deal?.title}</div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[--text-secondary]">
            {deal?.category && (
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-teal-400" />
                {deal.category.replaceAll("-", " ")}
              </span>
            )}
            {deal?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                {deal.location}
              </span>
            )}
            {deal?.min_check && (
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-teal-400" />
                Min: {deal.min_check}
              </span>
            )}
          </div>

          <FundingProgress
            targetRaise={deal?.target_raise ?? null}
            totalCommitted={deal?.total_committed ?? 0}
          />
        </div>

        {/* Investment form */}
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6 space-y-5">
          <div className="text-lg font-semibold">Your Investment</div>

          {/* Amount */}
          <div>
            <label className="text-sm text-[--text-secondary]">
              Investment Amount (USD) *
              {minCheck && (
                <span className="text-[--text-muted] ml-2">
                  Min: ${minCheck.toLocaleString()}
                </span>
              )}
            </label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[--text-muted]">$</span>
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  setAmount(raw ? formatCurrencyInput(raw) : "");
                }}
                className="w-full rounded-xl bg-[--bg-input] border border-[--border] pl-8 pr-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted] text-lg font-semibold"
                placeholder="100,000"
              />
            </div>
            {minCheck && rawAmount > 0 && rawAmount < minCheck && (
              <p className="text-xs text-red-400 mt-1">
                Amount must be at least ${minCheck.toLocaleString()}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-[--text-secondary]">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              rows={3}
              placeholder="Any notes about your commitment..."
            />
          </div>

          {/* Risk acknowledgment */}
          <label className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={riskAck}
              onChange={(e) => setRiskAck(e.target.checked)}
              className="mt-1 h-4 w-4 accent-teal-500"
            />
            <div className="text-sm text-[--text-secondary]">
              <div className="font-medium text-[--text-primary]">Risk Acknowledgment</div>
              <div className="text-xs text-[--text-muted] mt-0.5">
                I understand that investing carries risk, including the potential loss of my entire investment.
                I have conducted my own due diligence and am making this commitment based on my own judgment.
              </div>
            </div>
          </label>

          {/* Terms */}
          <label className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAck}
              onChange={(e) => setTermsAck(e.target.checked)}
              className="mt-1 h-4 w-4 accent-teal-500"
            />
            <div className="text-sm text-[--text-secondary]">
              I agree to the{" "}
              <Link href="/terms" className="text-teal-400 underline underline-offset-2" target="_blank">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/disclaimer" className="text-teal-400 underline underline-offset-2" target="_blank">
                Disclaimer
              </Link>
              .
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="text-sm rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              "w-full rounded-xl px-6 py-3 font-semibold transition-all text-sm",
              canSubmit
                ? "bg-teal-500 text-white hover:bg-teal-600"
                : "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed",
            ].join(" ")}
          >
            {submitting ? "Submitting..." : "Submit Commitment"}
          </button>
        </div>
      </div>
    </div>
  );
}
