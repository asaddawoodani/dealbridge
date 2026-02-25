"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

type Conversation = {
  id: string;
  deal_id: string;
  deal_title: string;
  other_user: { id: string; name: string };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/conversations");
        const json = await res.json().catch(() => null);
        if (res.ok && json?.conversations) {
          setConversations(json.conversations);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-[--text-secondary] mt-2">
            Your conversations with investors and operators.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[--text-muted]" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-8 text-center space-y-4">
            <MessageSquare className="h-12 w-12 text-[--text-muted] mx-auto" />
            <h2 className="text-lg font-semibold">No conversations yet</h2>
            <p className="text-[--text-secondary] text-sm">
              Start by requesting an introduction on a deal.
            </p>
            <Link
              href="/deals"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-400 hover:text-teal-300 transition"
            >
              Browse deals
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/messages/${c.id}`)}
                className="w-full text-left rounded-xl border border-[--border] bg-[--bg-card] p-4 hover:border-[--border-hover] transition-all flex items-start gap-3"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-semibold text-sm shrink-0">
                  {c.other_user.name.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={[
                        "text-sm font-semibold truncate",
                        c.unread_count > 0
                          ? "text-[--text-primary]"
                          : "text-[--text-secondary]",
                      ].join(" ")}
                    >
                      {c.other_user.name}
                    </span>
                    {c.last_message && (
                      <span className="text-xs text-[--text-muted] shrink-0">
                        {timeAgo(c.last_message.created_at)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[--text-muted] mt-0.5 truncate">
                    {c.deal_title}
                  </p>

                  {c.last_message && (
                    <p
                      className={[
                        "text-sm mt-1 truncate",
                        c.unread_count > 0
                          ? "text-[--text-primary] font-medium"
                          : "text-[--text-muted]",
                      ].join(" ")}
                    >
                      {c.last_message.content.slice(0, 80)}
                      {c.last_message.content.length > 80 ? "..." : ""}
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {c.unread_count > 0 && (
                  <span className="shrink-0 mt-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-teal-500 text-white text-[11px] font-bold">
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
