"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Building2, TrendingUp } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"investor" | "operator">("investor");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md text-center">
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
              <UserPlus className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Check your email</h1>
            <p className="text-[--text-secondary]">
              We sent a confirmation link to <span className="text-[--text-primary] font-medium">{email}</span>. Click it to activate your account.
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
    <div className="flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Create account</h1>
          <p className="text-[--text-secondary] mt-2">Join Dealbridge</p>
        </div>

        <form onSubmit={handleSignUp} className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-[--text-secondary]">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="John Doe"
            />
          </div>

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

          <div>
            <label className="text-sm text-[--text-secondary]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary]">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
              placeholder="Repeat password"
            />
          </div>

          <div>
            <label className="text-sm text-[--text-secondary] mb-3 block">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("investor")}
                className={[
                  "rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all flex items-center gap-2 justify-center",
                  role === "investor"
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/40"
                    : "border-[--border] text-[--text-secondary] hover:border-[--border-hover]",
                ].join(" ")}
              >
                <TrendingUp className="h-4 w-4" />
                Investor
              </button>
              <button
                type="button"
                onClick={() => setRole("operator")}
                className={[
                  "rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all flex items-center gap-2 justify-center",
                  role === "operator"
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/40"
                    : "border-[--border] text-[--text-secondary] hover:border-[--border-hover]",
                ].join(" ")}
              >
                <Building2 className="h-4 w-4" />
                List my business
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 accent-teal-500 mt-0.5"
            />
            <span className="text-sm text-[--text-secondary]">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-teal-400 underline underline-offset-2">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-teal-400 underline underline-offset-2">Privacy Policy</a>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !termsAccepted}
            className="w-full rounded-xl bg-teal-500 text-white px-4 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>

          <div className="text-center text-sm">
            <a href="/auth/login" className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4">
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
