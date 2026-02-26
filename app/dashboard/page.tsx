"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Wallet,
  Clock,
  Settings,
  Eye,
  Search,
  ArrowRight,
  Tag,
  Handshake,
  MessageSquare,
  Mail,
  Activity,
} from "lucide-react";

type InvestorProfile = {
  id: string;
  created_at: string;
  categories: string[];
  subcategories: string[];
  tags: string[];
  check_size: string | null;
  timeline: string | null;
  involvement: string | null;
  verified_only: boolean;
};

type InvestorAnalytics = {
  introsSent: number;
  activeConversations: number;
  unreadMessages: number;
  recentActivity: { type: string; description: string; created_at: string }[];
};

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<InvestorAnalytics | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Get profile name
      const { data: authProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setUserName(authProfile?.full_name || null);

      const { data, error } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setProfile(data ?? null);
      setLoading(false);

      // Fetch analytics
      fetch("/api/investor/analytics")
        .then((r) => r.json())
        .then((d) => { if (d.introsSent !== undefined) setAnalytics(d); })
        .catch(() => {});
    };

    run();
  }, [supabase]);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Investor Dashboard</h1>
            <p className="text-[--text-secondary] mt-2">
              {userName ? `Welcome back, ${userName}` : "Your investment profile overview."}
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/deals"
            className="rounded-2xl border border-[--border] bg-[--bg-card] p-5 hover:border-[--border-hover] transition-all group flex items-center gap-4"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Browse Deals</div>
              <div className="text-xs text-[--text-muted]">Find opportunities</div>
            </div>
            <ArrowRight className="h-4 w-4 text-[--text-muted] ml-auto group-hover:text-[--text-primary] transition" />
          </Link>

          <Link
            href="/portfolio"
            className="rounded-2xl border border-[--border] bg-[--bg-card] p-5 hover:border-[--border-hover] transition-all group flex items-center gap-4"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">My Portfolio</div>
              <div className="text-xs text-[--text-muted]">Track investments</div>
            </div>
            <ArrowRight className="h-4 w-4 text-[--text-muted] ml-auto group-hover:text-[--text-primary] transition" />
          </Link>

          <Link
            href="/onboarding"
            className="rounded-2xl border border-[--border] bg-[--bg-card] p-5 hover:border-[--border-hover] transition-all group flex items-center gap-4"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Edit Preferences</div>
              <div className="text-xs text-[--text-muted]">Update matching</div>
            </div>
            <ArrowRight className="h-4 w-4 text-[--text-muted] ml-auto group-hover:text-[--text-primary] transition" />
          </Link>

          <Link
            href="/deals"
            className="rounded-2xl border border-[--border] bg-[--bg-card] p-5 hover:border-[--border-hover] transition-all group flex items-center gap-4"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Matched Deals</div>
              <div className="text-xs text-[--text-muted]">Your recommendations</div>
            </div>
            <ArrowRight className="h-4 w-4 text-[--text-muted] ml-auto group-hover:text-[--text-primary] transition" />
          </Link>
        </div>

        {/* Activity Stats */}
        {analytics && (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Intros Sent", value: analytics.introsSent, icon: Handshake, color: "text-teal-400" },
                { label: "Active Conversations", value: analytics.activeConversations, icon: MessageSquare, color: "text-purple-400" },
                { label: "Unread Messages", value: analytics.unreadMessages, icon: Mail, color: "text-amber-400" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-[--border] bg-[--bg-card] p-5"
                >
                  <div className="flex items-center gap-2 text-xs text-[--text-muted] mb-2">
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                    {s.label}
                  </div>
                  <div className="text-2xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            {analytics.recentActivity.length > 0 && (
              <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <h2 className="font-semibold text-sm">Recent Activity</h2>
                </div>
                <div className="space-y-3">
                  {analytics.recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--bg-input] p-3"
                    >
                      <div className="mt-0.5">
                        {item.type === "intro" ? (
                          <Handshake className="h-3.5 w-3.5 text-teal-400" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{item.description}</div>
                        <div className="text-xs text-[--text-muted] mt-1">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-[--text-secondary]">
            Loading profile...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-6">
            <div className="font-semibold mb-2">Couldn&apos;t load profile</div>
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}

        {!loading && !error && !profile && (
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
              <Settings className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">Complete your profile</h2>
            <p className="text-[--text-secondary] mb-6">
              Set your investment preferences to get matched with the right deals.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 text-white px-6 py-3 font-semibold hover:bg-teal-600 transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {!loading && !error && profile && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-5">
                <div className="flex items-center gap-2 text-[--text-muted] text-xs mb-2">
                  <Wallet className="h-3.5 w-3.5" />
                  Check size
                </div>
                <div className="font-bold text-lg">{profile.check_size ?? "---"}</div>
              </div>

              <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-5">
                <div className="flex items-center gap-2 text-[--text-muted] text-xs mb-2">
                  <Clock className="h-3.5 w-3.5" />
                  Timeline
                </div>
                <div className="font-bold text-lg">{profile.timeline?.replace(/_/g, " ") ?? "---"}</div>
              </div>

              <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-5">
                <div className="flex items-center gap-2 text-[--text-muted] text-xs mb-2">
                  <Settings className="h-3.5 w-3.5" />
                  Involvement
                </div>
                <div className="font-bold text-lg capitalize">{profile.involvement?.replace(/_/g, " ") ?? "---"}</div>
              </div>

              <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-5">
                <div className="flex items-center gap-2 text-[--text-muted] text-xs mb-2">
                  <Eye className="h-3.5 w-3.5" />
                  Verified only
                </div>
                <div className="font-bold text-lg">{profile.verified_only ? "Yes" : "No"}</div>
              </div>
            </div>

            {/* Profile details */}
            <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Your Preferences</h2>
                <div className="text-xs text-[--text-muted]">
                  Updated: {new Date(profile.created_at).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[--text-secondary] mb-2">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {profile.categories.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm text-teal-400"
                    >
                      {c.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[--text-secondary] mb-2">Subcategories</div>
                <div className="flex flex-wrap gap-2">
                  {profile.subcategories.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full bg-[--bg-elevated] border border-[--border] text-sm text-[--text-secondary]"
                    >
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              {profile.tags.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-[--text-secondary] mb-2 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.tags.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
