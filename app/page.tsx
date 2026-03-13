import Link from "next/link";
import { ShieldCheck, FileCheck, Lock, MessageSquare } from "lucide-react";
import FadeIn from "@/components/landing/FadeIn";
import ValuePropTabs from "@/components/landing/ValuePropTabs";

const STEPS = [
  {
    step: "01",
    title: "Create Your Profile",
    description:
      "Tell us your investment preferences — sectors, check size, timeline, and involvement level. Takes under 5 minutes.",
  },
  {
    step: "02",
    title: "Get Matched",
    description:
      "Our algorithm scores every deal against your profile and surfaces the best opportunities. New matches delivered to your dashboard.",
  },
  {
    step: "03",
    title: "Connect & Invest",
    description:
      "Request introductions, review documents, message operators directly, and commit funds — all within DealBridge.",
  },
];

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: "Verified Operators", desc: "Identity checks on every business" },
  { icon: FileCheck, label: "KYC Compliance", desc: "Full investor verification process" },
  { icon: Lock, label: "Escrow Protection", desc: "Funds secured via Stripe" },
  { icon: MessageSquare, label: "Encrypted Messaging", desc: "Private investor-operator comms" },
];

function Divider() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div
        className="h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--border), transparent)",
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <div className="text-[--text-primary]">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(20,184,166,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <FadeIn>
            <p className="inline-block text-sm font-medium px-4 py-1.5 rounded-full mb-8 text-teal-400 bg-teal-500/[0.08] border border-teal-500/20">
              Private deal flow for qualified investors
            </p>
          </FadeIn>

          <FadeIn delay={150}>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
              style={{
                fontFamily: "var(--font-instrument-serif), serif",
                letterSpacing: "-0.02em",
              }}
            >
              Access Private Deals
              <br />
              <span className="text-teal-400">Matched to You</span>
            </h1>
          </FadeIn>

          <FadeIn delay={300}>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-[--text-secondary]">
              DealBridge connects qualified investors with vetted private
              businesses. Smart matching, verified operators, and
              escrow-protected payments — all in one platform.
            </p>
          </FadeIn>

          <FadeIn delay={450}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup?role=investor"
                className="px-8 py-4 rounded-xl text-base font-semibold text-white hover:scale-105 hover:[background-color:var(--accent-hover)] transition-all"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Join as Investor →
              </Link>
              <Link
                href="/auth/signup?role=operator"
                className="px-8 py-4 rounded-xl text-base font-semibold border border-[--border-hover] text-[--text-primary] bg-[--bg-elevated]/50 hover:border-[--text-muted] transition-all hover:scale-105"
              >
                List Your Deal
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <Divider />

      {/* ─── VALUE PROPS ─── */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <FadeIn>
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-instrument-serif), serif" }}
          >
            Built for Both Sides
          </h2>
          <p className="text-center mb-12 text-[--text-muted]">
            Whether you&apos;re investing or raising — DealBridge works for you.
          </p>
        </FadeIn>

        <FadeIn delay={100}>
          <ValuePropTabs />
        </FadeIn>
      </section>

      <Divider />

      {/* ─── HOW IT WORKS ─── */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <FadeIn>
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-instrument-serif), serif" }}
          >
            How It Works
          </h2>
          <p className="text-center mb-16 text-[--text-muted]">
            From profile to portfolio in three steps.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((item, i) => (
            <FadeIn key={item.step} delay={i * 150}>
              <div className="rounded-2xl p-8 bg-[--bg-card] border border-[--border] hover:border-[--border-hover] transition-all">
                <span
                  className="text-5xl font-bold text-teal-400/15"
                  style={{
                    fontFamily: "var(--font-instrument-serif), serif",
                  }}
                >
                  {item.step}
                </span>
                <h3 className="text-xl font-bold mt-4 mb-3">{item.title}</h3>
                <p className="text-[--text-secondary] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ─── TRUST SIGNALS ─── */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <FadeIn>
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-instrument-serif), serif" }}
          >
            Invest with Confidence
          </h2>
          <p className="text-center mb-16 text-[--text-muted]">
            Security and transparency at every step.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_SIGNALS.map((item, i) => (
            <FadeIn key={item.label} delay={i * 100}>
              <div className="text-center rounded-2xl p-6 bg-[--bg-card] border border-[--border] hover:border-[--border-hover] transition-all">
                <div className="flex justify-center mb-3 text-teal-400">
                  <item.icon className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h4 className="font-bold mb-1">{item.label}</h4>
                <p className="text-sm text-[--text-muted]">{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(20,184,166,0.04), transparent)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center px-6 py-20 md:py-28">
          <FadeIn>
            <h2
              className="text-3xl md:text-5xl font-bold mb-6"
              style={{ fontFamily: "var(--font-instrument-serif), serif" }}
            >
              Ready to Find Your Next
              <br />
              <span className="text-teal-400">Investment?</span>
            </h2>
            <p className="text-lg mb-10 text-[--text-secondary]">
              Join DealBridge today and get access to vetted private deals
              matched to your investment preferences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="px-8 py-4 rounded-xl text-base font-semibold text-white hover:scale-105 hover:[background-color:var(--accent-hover)] transition-all"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Get Started →
              </Link>
              <Link
                href="/deals"
                className="px-8 py-4 rounded-xl text-base font-semibold border border-[--border-hover] text-[--text-primary] bg-[--bg-elevated]/50 hover:border-[--text-muted] transition-all hover:scale-105"
              >
                Browse Deals
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
