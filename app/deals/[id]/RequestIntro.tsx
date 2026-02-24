"use client";

import { useMemo, useState } from "react";
import { Send, Shield } from "lucide-react";

type Msg = { type: "ok" | "err"; text: string } | null;

export default function RequestIntro({
  dealId,
  dealTitle,
}: {
  dealId: string;
  dealTitle: string;
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

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Something went wrong.");
      }

      setMsg({ type: "ok", text: "Request sent! We'll follow up shortly." });
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
