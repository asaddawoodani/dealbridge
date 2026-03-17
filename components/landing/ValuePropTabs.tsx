"use client";

import { useState } from "react";
import {
  Target,
  ShieldCheck,
  Wallet,
  Lock,
  Handshake,
  CreditCard,
} from "lucide-react";
import FadeIn from "./FadeIn";

const INVESTOR_CARDS = [
  {
    icon: Target,
    title: "Deals Matched to Your Preferences",
    description:
      "Set your investment criteria — sectors, check size, timeline — and we surface deals that fit. No more sifting through irrelevant opportunities.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Operators Only",
    description:
      "Every operator goes through identity verification and deal review. You only see businesses that meet our quality standards.",
  },
  {
    icon: Wallet,
    title: "Escrow-Protected Payments",
    description:
      "Your funds are held securely via Stripe until the deal is finalized. Full transparency on where your money is at every stage.",
  },
  {
    icon: Lock,
    title: "Private & Confidential",
    description:
      "Your identity stays hidden until you choose to connect. Operators only see your preferences — not your name — until you accept an introduction.",
  },
];

const OPERATOR_CARDS = [
  {
    icon: Handshake,
    title: "Qualified Investors Come to You",
    description:
      "No cold outreach. Verified investors browse your deal and request introductions when they're interested. You focus on running your business.",
  },
  {
    icon: Target,
    title: "Smart Matching",
    description:
      "Your deal gets surfaced to investors whose preferences align with your sector, size, and terms. Higher quality leads, less noise.",
  },
  {
    icon: CreditCard,
    title: "Built-In Payment Processing",
    description:
      "Commitments and payments handled through Stripe. No chasing wires. Investors fund directly through the platform with escrow protection.",
  },
  {
    icon: ShieldCheck,
    title: "Free to List",
    description:
      "Submit your deal for review at no cost. Upload pitch decks, financials, and set your terms. Only pay when you successfully raise capital.",
  },
];

export default function ValuePropTabs() {
  const [activeTab, setActiveTab] = useState<"investor" | "operator">(
    "investor"
  );
  const cards = activeTab === "investor" ? INVESTOR_CARDS : OPERATOR_CARDS;

  return (
    <>
      <div className="flex justify-center mb-12">
        <div className="inline-flex rounded-xl p-1 bg-slate-800">
          <button
            onClick={() => setActiveTab("investor")}
            className={[
              "px-6 py-3 rounded-lg text-sm font-semibold transition-all",
              activeTab === "investor"
                ? "bg-teal-500 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            For Investors
          </button>
          <button
            onClick={() => setActiveTab("operator")}
            className={[
              "px-6 py-3 rounded-lg text-sm font-semibold transition-all",
              activeTab === "operator"
                ? "bg-teal-500 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            For Operators
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {cards.map((card, i) => (
          <FadeIn key={`${activeTab}-${i}`} delay={i * 100}>
            <div className="rounded-2xl p-8 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all">
              <div className="mb-5 text-teal-400">
                <card.icon className="h-10 w-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)]">
                {card.title}
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {card.description}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </>
  );
}
