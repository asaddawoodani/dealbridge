"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Fetch role to decide redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role ?? "investor";
      if (redirectTo !== "/dashboard") {
        router.push(redirectTo);
      } else if (role === "admin") {
        router.push("/admin/deals");
      } else if (role === "operator") {
        router.push("/deals");
      } else {
        router.push("/dashboard");
      }
    } else {
      router.push(redirectTo);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="text-[--text-secondary] mt-2">Welcome back to Dealbridge</p>
      </div>

      <form onSubmit={handleLogin} className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-200">
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

        <div>
          <label className="text-sm text-[--text-secondary]">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
            placeholder="Your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-teal-500 text-white px-4 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <a href="/auth/forgot-password" className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4">
            Forgot password?
          </a>
          <a href="/auth/signup" className="text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4">
            Create account
          </a>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-20">
      <Suspense fallback={<div className="text-[--text-muted]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
