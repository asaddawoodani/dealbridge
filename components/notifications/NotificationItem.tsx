"use client";

import {
  Sparkles,
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  FileCheck,
  FileX,
  AlertCircle,
  Handshake,
} from "lucide-react";

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

const ICON_MAP: Record<string, { icon: typeof Sparkles; color: string }> = {
  deal_match: { icon: Sparkles, color: "text-teal-400" },
  commitment_update: { icon: TrendingUp, color: "text-blue-400" },
  payment_success: { icon: CheckCircle, color: "text-emerald-400" },
  payment_failed: { icon: XCircle, color: "text-red-400" },
  payment_refunded: { icon: RefreshCw, color: "text-orange-400" },
  message_received: { icon: MessageSquare, color: "text-purple-400" },
  verification_approved: { icon: ShieldCheck, color: "text-emerald-400" },
  verification_rejected: { icon: ShieldX, color: "text-red-400" },
  kyc_approved: { icon: FileCheck, color: "text-emerald-400" },
  kyc_rejected: { icon: FileX, color: "text-red-400" },
  deal_approved: { icon: CheckCircle, color: "text-emerald-400" },
  deal_rejected: { icon: XCircle, color: "text-red-400" },
  intro_accepted: { icon: Handshake, color: "text-teal-400" },
};

const ADMIN_ICON = { icon: AlertCircle, color: "text-amber-400" };

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick?: () => void;
}) {
  const mapping = notification.type.startsWith("admin_")
    ? ADMIN_ICON
    : ICON_MAP[notification.type] ?? ADMIN_ICON;
  const Icon = mapping.icon;

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 w-full text-left px-4 py-3 hover:bg-[--bg-elevated] transition-all rounded-lg"
    >
      {!notification.read && (
        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
      )}
      {notification.read && <div className="mt-2 h-1.5 w-1.5 shrink-0" />}
      <div className={`mt-0.5 shrink-0 ${mapping.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${notification.read ? "text-[--text-secondary]" : "text-[--text-primary]"}`}>
          {notification.title}
        </div>
        <div className="text-xs text-[--text-muted] mt-0.5 line-clamp-2">
          {notification.message}
        </div>
        <div className="text-xs text-[--text-muted] mt-1">
          {timeAgo(notification.created_at)}
        </div>
      </div>
    </button>
  );
}
