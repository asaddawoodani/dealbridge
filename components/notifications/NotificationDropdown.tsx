"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import NotificationItem, { type Notification } from "./NotificationItem";

export default function NotificationDropdown({
  notifications,
  onMarkAllRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const hasUnread = notifications.some((n) => !n.read);

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [n.id] }),
      }).catch(() => {});
    }
    onClose();
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <div
      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-700 shadow-xl z-50 max-h-[28rem] flex flex-col"
      style={{ backgroundColor: '#0f172a' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-[--text-primary]">Notifications</h3>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 px-1">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[--text-muted]">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={() => handleClick(n)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2.5">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block text-center text-xs font-medium text-teal-400 hover:text-teal-300 transition"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
