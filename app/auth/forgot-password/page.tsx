"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-20">
        <div className="w-full max-w-md text-center">
          <div className="bg-[--bg-card] border border-[--border] rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-3">Check your email</h1>
            <p className="text-[--text-secondary]">
              If an account exists for <span className="text-[--text-primary]">{email}</span>, you&apos;ll receive a password reset link.
            </p>
            <a
              href="/auth/login"
              className="inline-block mt-6 text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Reset password</h1>
          <p className="text-[--text-secondary] mt-2">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[--bg-card] border border-[--border] rounded-xl p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-[--bg-error] border border-[--border-error] px-4 py-3 text-sm text-[--text-error]">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-[--text-secondary]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-500 text-white px-4 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <div className="text-center text-sm">
            <a href="/auth/login" className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4">
              Back to sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
