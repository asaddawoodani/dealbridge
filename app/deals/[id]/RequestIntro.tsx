"use client";

import { useMemo, useState } from "react";
import { Send, Shield, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Msg = { type: "ok" | "err"; text: string; conversationId?: string } | null;

export default function RequestIntro({
  dealId,
  dealTitle,
  verificationStatus,
}: {
  dealId: string;
  dealTitle: string;
  verificationStatus: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [minCheck, setMinCheck] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const emailOk = useMemo(() => {
    const e = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  const canSubmit = useMemo(() => {
    return name.trim().length >= 2 && emailOk && confirm && !loading;
  }, [name, emailOk, confirm, loading]);

  const submit = async () => {
    setMsg(null);

    if (!name.trim() || !email.trim()) {
      setMsg({ type: "err", text: "Name + email are required." });
      return;
    }
    if (!emailOk) {
      setMsg({ type: "err", text: "Please enter a valid email address." });
      return;
    }
    if (!confirm) {
      setMsg({ type: "err", text: "Please confirm before sending." });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        deal_id: dealId,
        name: name.trim(),
        email: email.trim(),
        message: [
          linkedin.trim() ? `LinkedIn: ${linkedin.trim()}` : "",
          minCheck.trim() ? `Check size: ${minCheck.trim()}` : "",
          note.trim() || "",
        ]
          .filter(Boolean)
          .join("\n") || null,
      };

      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(j?.error ?? "Something went wrong.");
      }

      setMsg({
        type: "ok",
        text: "Request sent! We'll follow up shortly.",
        conversationId: j?.conversationId ?? undefined,
      });
      setName("");
      setEmail("");
      setLinkedin("");
      setMinCheck("");
      setNote("");
      setConfirm(false);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  // Gate: not verified
  if (verificationStatus !== "verified") {
    const isLoggedIn = verificationStatus !== null;
    const isPending = verificationStatus === "pending";
    const isRejected = verificationStatus === "rejected";

    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center space-y-3">
        <ShieldAlert className="h-8 w-8 text-amber-400 mx-auto" />
        <div className="text-sm font-semibold text-[--text-primary]">
          {isPending
            ? "Verification Pending"
            : isRejected
            ? "Verification Rejected"
            : "Verification Required"}
        </div>
        <div className="text-xs text-[--text-secondary]">
          {isPending
            ? "Your verification is being reviewed. You'll be able to request introductions once approved."
            : isRejected
            ? "Your verification was not approved. Please resubmit to request introductions."
            : isLoggedIn
            ? "You need to verify your account before requesting deal introductions."
            : "Log in and verify your account to request deal introductions."}
        </div>
        {!isPending && (
          <Link
            href={isLoggedIn ? "/verify" : "/auth/login"}
            className="inline-block rounded-xl bg-amber-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-amber-600 transition-all"
          >
            {isLoggedIn ? (isRejected ? "Resubmit Verification" : "Verify Account") : "Log In"}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Form */}
      <div className="grid grid-cols-1 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name *"
          className="w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email *"
          className="w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={minCheck}
            onChange={(e) => setMinCheck(e.target.value)}
            placeholder='Check size (optional) e.g. "50k"'
            className="w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
          />

          <input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="LinkedIn (optional)"
            className="w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
          />
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Short note (optional)... e.g. "Interested in ${dealTitle}. Can review CIM this week."`}
          rows={3}
          className="w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
        />

        <label className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="mt-1 h-4 w-4 accent-teal-500"
          />
          <div className="text-sm text-[--text-secondary]">
            <div className="font-medium text-[--text-primary]">
              I&apos;m a qualified investor and agree not to spam operators.
            </div>
            <div className="text-xs text-[--text-muted] mt-0.5">
              This helps keep the marketplace high-quality.
            </div>
          </div>
        </label>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className={[
          "w-full rounded-xl px-4 py-3 font-semibold transition-all flex items-center justify-center gap-2",
          canSubmit
            ? "bg-teal-500 text-white hover:bg-teal-600"
            : "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed",
        ].join(" ")}
      >
        {loading ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-4 w-4" />
            Request Intro
          </>
        )}
      </button>

      {/* Message */}
      {msg && (
        <div
          className={[
            "text-sm rounded-xl border px-4 py-3",
            msg.type === "ok"
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              : "border-red-500/30 text-red-400 bg-red-500/10",
          ].join(" ")}
        >
          {msg.text}
          {msg.type === "ok" && msg.conversationId && (
            <Link
              href={`/messages/${msg.conversationId}`}
              className="block mt-2 font-medium text-emerald-300 hover:text-emerald-200 transition"
            >
              Go to conversation &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Hint */}
      <div className="text-xs text-[--text-muted] flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Required: name + valid email.
      </div>
    </div>
  );
}
