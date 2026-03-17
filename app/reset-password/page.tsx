"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      let data: { error?: string; ok?: boolean };
      try {
        data = await res.json();
      } catch {
        setError("Server returned an unexpected response. Please try again.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        if (data.error === "reused") {
          setError(
            "You cannot reuse your last 3 passwords. Please choose a different one."
          );
        } else if (res.status === 401) {
          setError("Your session has expired. Please request a new reset link.");
        } else {
          setError(data.error || "Something went wrong.");
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Full page reload to login so the server Navbar re-renders
      setTimeout(() => (window.location.href = "/auth/login"), 3000);
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-20">
        <div className="w-full max-w-md text-center">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Password updated</h1>
            <p className="text-[var(--text-secondary)]">
              Your password has been reset successfully. Redirecting to sign in...
            </p>
            <a
              href="/auth/login"
              className="inline-block mt-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-4"
            >
              Go to sign in
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
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Set new password</h1>
          <p className="text-[var(--text-secondary)] mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-[var(--bg-error)] border border-[var(--border-error)] px-4 py-3 text-sm text-[var(--text-error)]">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-[var(--text-secondary)]">New password</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              showStrength
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)]">Confirm new password</label>
            <PasswordInput
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-500 text-white px-4 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          <div className="text-center text-sm">
            <a href="/auth/login" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-4">
              Back to sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
