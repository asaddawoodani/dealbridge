import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RequestIntro from "./RequestIntro";
import DealDocuments from "./DealDocuments";
import {
  ArrowLeft,
  MapPin,
  Wallet,
  Tag,
  Calendar,
  Shield,
  CheckCircle2,
  FileText,
  ArrowRight,
} from "lucide-react";

type Deal = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: string | null;
  min_check: string | null;
  location: string | null;
  status: string | null;
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function prettyLabel(v: string | null | undefined) {
  if (!v) return "\u2014";
  return v;
}

function prettyCategory(v: string | null | undefined) {
  if (!v) return "\u2014";
  return v.replaceAll("-", " ");
}

async function getDeal(id: string): Promise<Deal | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const res = await fetch(`${base}/api/deals/${id}`, { cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  return (json?.deal ?? null) as Deal | null;
}

export default async function DealDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await Promise.resolve(params);

  const deal = await getDeal(id);
  if (!deal) return notFound();

  // Fetch user's verification status and role
  let verificationStatus: string | null = null;
  let userRole: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status, role")
        .eq("id", user.id)
        .single();
      verificationStatus = profile?.verification_status ?? null;
      userRole = profile?.role ?? null;
    }
  } catch {
    // not logged in — leave null
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Top nav */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/deals"
            className="text-[--text-muted] hover:text-[--text-primary] flex items-center gap-1.5 transition text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </Link>

          <span
            className={[
              "text-xs px-3 py-1.5 rounded-full border font-medium",
              deal.status === "active"
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                : "border-[--border] text-[--text-muted]",
            ].join(" ")}
          >
            {deal.status ?? "\u2014"}
          </span>
        </div>

        {/* Hero container */}
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 shadow-lg">
          <div className="flex flex-col gap-6">
            {/* Title block */}
            <div>
              <div className="text-xs text-[--text-muted] uppercase tracking-wider font-medium">Deal Details</div>
              <h1 className="text-4xl font-bold tracking-tight mt-2">
                {deal.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-[--text-secondary] mt-3">
                <span className="flex items-center gap-1.5 text-sm">
                  <Tag className="h-3.5 w-3.5 text-teal-400" />
                  {prettyCategory(deal.category)}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-teal-400" />
                  {prettyLabel(deal.location)}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <Wallet className="h-3.5 w-3.5 text-teal-400" />
                  {prettyLabel(deal.min_check)}
                </span>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[--border] bg-[--bg-input] p-5">
                <div className="text-xs text-[--text-muted] flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Category
                </div>
                <div className="text-lg font-semibold mt-1 capitalize">
                  {prettyCategory(deal.category)}
                </div>
              </div>

              <div className="rounded-xl border border-[--border] bg-[--bg-input] p-5">
                <div className="text-xs text-[--text-muted] flex items-center gap-1.5">
                  <Wallet className="h-3 w-3" />
                  Minimum check
                </div>
                <div className="text-lg font-semibold mt-1">
                  {prettyLabel(deal.min_check)}
                </div>
              </div>

              <div className="rounded-xl border border-[--border] bg-[--bg-input] p-5">
                <div className="text-xs text-[--text-muted] flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  Location
                </div>
                <div className="text-lg font-semibold mt-1">
                  {prettyLabel(deal.location)}
                </div>
              </div>
            </div>

            {/* Body grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                <section className="rounded-xl border border-[--border] bg-[--bg-input] p-6">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-teal-400" />
                    Overview
                  </div>
                  {deal.description ? (
                    <div className="text-[--text-secondary] mt-3 whitespace-pre-wrap leading-relaxed">
                      {deal.description}
                    </div>
                  ) : (
                    <div className="text-[--text-muted] mt-3">No description provided.</div>
                  )}
                </section>

                <DealDocuments
                  dealId={deal.id}
                  verificationStatus={verificationStatus}
                  userRole={userRole}
                />
              </div>

              {/* Sidebar */}
              <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
                {/* Premium CTA */}
                <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-[--bg-card] p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[--text-muted]">Private Access</div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                      Verified flow
                    </span>
                  </div>

                  <div className="text-base font-semibold mt-2">
                    Request an introduction
                  </div>
                  <div className="text-sm text-[--text-secondary] mt-2">
                    Send a short note. We&apos;ll connect you with the vetted operator and follow up.
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-[--text-secondary]">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>Direct communication with vetted operators</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>Share your background + check size</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>Request CIM / financials securely</span>
                    </li>
                  </ul>

                  <div className="mt-5">
                    <RequestIntro dealId={deal.id} dealTitle={deal.title} verificationStatus={verificationStatus} />
                  </div>

                  <div className="text-[11px] text-[--text-muted] mt-3">
                    Response times vary. Serious inquiries only.
                  </div>
                </div>

                {/* Meta */}
                <div className="rounded-xl border border-[--border] bg-[--bg-input] p-5 space-y-4">
                  <div>
                    <div className="text-xs text-[--text-muted] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Posted
                    </div>
                    <div className="text-sm text-[--text-secondary] mt-1">
                      {fmtDateTime(deal.created_at)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[--text-muted] flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Deal ID
                    </div>
                    <div className="text-sm text-[--text-secondary] mt-1 break-all font-mono text-xs">
                      {deal.id}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[--text-muted]">Next step</div>
                    <div className="text-sm text-[--text-secondary] mt-1">
                      Request the CIM / details from the vetted operator.
                    </div>
                  </div>
                </div>

                <Link
                  href="/deals"
                  className="block text-center rounded-xl border border-[--border] px-4 py-3 font-semibold hover:border-[--border-hover] transition-all text-sm flex items-center justify-center gap-2"
                >
                  Browse more deals
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
