import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Building2,
} from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Create Your Profile",
    description:
      "Tell us your investment preferences — categories, check size, timeline, and tags that matter to you.",
    icon: Users,
  },
  {
    step: "02",
    title: "Get Matched",
    description:
      "Our algorithm scores every deal against your profile and surfaces the best opportunities.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Request Introductions",
    description:
      "Connect directly with qualified, vetted operators. Review CIMs, ask questions, and move quickly.",
    icon: Building2,
  },
];

export default function Home() {
  return (
    <div className="text-[--text-primary]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-4 py-1.5 text-sm text-teal-400 mb-8">
            <Shield className="h-4 w-4" />
            Private deal flow for qualified investors
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Invest in what{" "}
            <span className="bg-gradient-to-r from-teal-400 to-teal-200 bg-clip-text text-transparent">
              matters
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[--text-secondary] mt-6 max-w-2xl mx-auto leading-relaxed">
            Connect with vetted businesses and qualified operators matched
            to your interests. Smart matching, verified deal flow, private access.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-teal-500 text-white px-8 py-3.5 font-semibold hover:bg-teal-600 transition-all flex items-center gap-2 text-base"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/deals"
              className="rounded-xl border border-[--border] px-8 py-3.5 font-semibold hover:border-[--border-hover] transition-all text-base"
            >
              Browse Deals
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
          <p className="text-[--text-secondary] mt-3 max-w-xl mx-auto">
            From profile to portfolio in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 hover:border-[--border-hover] transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-[--text-muted]">{s.step}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-[--text-secondary] text-sm leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-[--border] bg-gradient-to-br from-teal-500/10 via-[--bg-card] to-[--bg-card] p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to find your next deal?</h2>
          <p className="text-[--text-secondary] mt-3 max-w-xl mx-auto">
            Join qualified investors and vetted operators who use Dealbridge to close deals faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-teal-500 text-white px-8 py-3.5 font-semibold hover:bg-teal-600 transition-all flex items-center gap-2"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="rounded-xl border border-[--border] px-8 py-3.5 font-semibold hover:border-[--border-hover] transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
