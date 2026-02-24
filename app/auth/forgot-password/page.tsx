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
      redirectTo: `${window.location.origin}/auth/callback`,
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-3">Check your email</h1>
            <p className="text-gray-400">
              If an account exists for <span className="text-white">{email}</span>, you'll receive a password reset link.
            </p>
            <a
              href="/auth/login"
              className="inline-block mt-6 text-gray-400 hover:text-white underline underline-offset-4"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Reset password</h1>
          <p className="text-gray-400 mt-2">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-950/40 border border-red-900 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/40 border border-zinc-700 px-4 py-3 outline-none focus:border-zinc-400"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black px-4 py-3 font-semibold hover:opacity-80 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <div className="text-center text-sm">
            <a href="/auth/login" className="text-gray-400 hover:text-white underline underline-offset-4">
              Back to sign in
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
