"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  MessageSquare,
  Handshake,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Overview = {
  totalUsers: number;
  totalDeals: number;
  activeDeals: number;
  pendingDeals: number;
  totalConversations: number;
  totalIntros: number;
};

type AnalyticsData = {
  overview: Overview;
  userGrowth: { date: string; count: number }[];
  dealActivity: { date: string; created: number; approved: number }[];
  verificationStats: { pending: number; verified: number; rejected: number };
  topDeals: { id: string; title: string; interestCount: number }[];
  categoryBreakdown: { category: string; count: number }[];
  recentActivity: { type: string; description: string; created_at: string }[];
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-[--text-secondary]">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-red-400">Failed to load analytics.</div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: data.overview.totalUsers, icon: Users, color: "text-teal-400" },
    { label: "Total Deals", value: data.overview.totalDeals, icon: Briefcase, color: "text-blue-400" },
    { label: "Active Deals", value: data.overview.activeDeals, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Pending Deals", value: data.overview.pendingDeals, icon: Clock, color: "text-amber-400" },
    { label: "Conversations", value: data.overview.totalConversations, icon: MessageSquare, color: "text-purple-400" },
    { label: "Introductions", value: data.overview.totalIntros, icon: Handshake, color: "text-pink-400" },
  ];

  const activityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <Users className="h-3.5 w-3.5 text-teal-400" />;
      case "deal":
        return <Briefcase className="h-3.5 w-3.5 text-blue-400" />;
      case "verification":
        return <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-[--text-muted]" />;
    }
  };

  // Format date labels for charts
  const formatDate = (d: unknown) => {
    const date = new Date(String(d));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-[--text-secondary] mt-1">Overview of platform activity and growth</p>
        </div>

        {/* Overview stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s) => (
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

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <h2 className="font-semibold">User Growth</h2>
              <span className="text-xs text-[--text-muted]">Last 30 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1E293B" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1E293B" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: "0.75rem",
                      color: "#F1F5F9",
                    }}
                    labelFormatter={formatDate}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#14B8A6"
                    fill="#14B8A6"
                    fillOpacity={0.2}
                    name="Signups"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deal Activity */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-blue-400" />
              <h2 className="font-semibold">Deal Activity</h2>
              <span className="text-xs text-[--text-muted]">Last 30 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dealActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1E293B" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1E293B" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: "0.75rem",
                      color: "#F1F5F9",
                    }}
                    labelFormatter={formatDate}
                  />
                  <Bar dataKey="created" fill="#14B8A6" name="Created" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="approved" fill="#10B981" name="Approved" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category + Verification row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-teal-400" />
              <h2 className="font-semibold">Deals by Category</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1E293B" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1E293B" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: "0.75rem",
                      color: "#F1F5F9",
                    }}
                  />
                  <Bar dataKey="count" fill="#14B8A6" name="Deals" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verification Stats */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <h2 className="font-semibold">Verification Status</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
                <ShieldAlert className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-400">
                  {data.verificationStats.pending}
                </div>
                <div className="text-xs text-[--text-muted] mt-1">Pending</div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <ShieldCheck className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-400">
                  {data.verificationStats.verified}
                </div>
                <div className="text-xs text-[--text-muted] mt-1">Verified</div>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                <ShieldX className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-400">
                  {data.verificationStats.rejected}
                </div>
                <div className="text-xs text-[--text-muted] mt-1">Rejected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Deals + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Deals */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="font-semibold">Top Deals by Interest</h2>
            </div>
            {data.topDeals.length === 0 ? (
              <div className="text-sm text-[--text-muted]">No interest data yet.</div>
            ) : (
              <div className="space-y-3">
                {data.topDeals.map((deal, i) => (
                  <div
                    key={deal.id}
                    className="flex items-center gap-3 rounded-xl border border-[--border] bg-[--bg-input] p-3"
                  >
                    <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{deal.title}</div>
                    </div>
                    <div className="text-sm font-semibold text-teal-400 shrink-0">
                      {deal.interestCount} {deal.interestCount === 1 ? "intro" : "intros"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-purple-400" />
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
            {data.recentActivity.length === 0 ? (
              <div className="text-sm text-[--text-muted]">No recent activity.</div>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--bg-input] p-3"
                  >
                    <div className="mt-0.5">{activityIcon(item.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{item.description}</div>
                      <div className="text-xs text-[--text-muted] mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
