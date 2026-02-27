"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import NotificationItem, {
  type Notification,
} from "@/components/notifications/NotificationItem";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "deals", label: "Deals" },
  { key: "payments", label: "Payments" },
  { key: "messages", label: "Messages" },
  { key: "admin", label: "Admin" },
];

const TAB_TYPES: Record<string, string[]> = {
  deals: ["deal_match", "deal_approved", "deal_rejected", "admin_new_deal"],
  payments: [
    "payment_success",
    "payment_failed",
    "payment_refunded",
    "commitment_update",
    "admin_new_commitment",
  ],
  messages: ["message_received"],
  admin: [
    "admin_new_user",
    "admin_new_deal",
    "admin_new_application",
    "admin_new_commitment",
    "admin_verification_request",
    "admin_kyc_submission",
  ],
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    const params = new URLSearchParams({
      limit: "30",
      offset: String(currentOffset),
    });
    if (tab === "unread") params.set("unread", "true");

    const res = await fetch(`/api/notifications?${params}`);
    const data = await res.json();

    if (data.notifications) {
      if (reset) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setHasMore(data.notifications.length === 30);
      setOffset(currentOffset + data.notifications.length);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered =
    tab === "all" || tab === "unread"
      ? notifications
      : notifications.filter((n) => TAB_TYPES[tab]?.includes(n.type));

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [n.id] }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
    }
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setNotifications([]);
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-7 w-7 text-teal-400" />
              Notifications
            </h1>
            <p className="text-[--text-secondary] mt-1">
              Stay updated on your deals, messages, and account activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[--border] text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-hover] transition-all"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[--border] text-xs font-medium text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0",
                tab === t.key
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                  : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-center text-[--text-muted]">
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
              <Bell className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No notifications</h2>
            <p className="text-[--text-secondary] text-sm">
              {tab === "unread"
                ? "You're all caught up!"
                : "Nothing here yet. Activity will show up as it happens."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] divide-y divide-[--border]">
            {filtered.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleClick(n)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && filtered.length > 0 && !loading && (
          <div className="mt-6 text-center">
            <button
              onClick={() => fetchNotifications()}
              className="rounded-xl bg-teal-500 text-white px-5 py-2.5 font-semibold hover:bg-teal-600 transition-all text-sm"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
