"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type ConversationMeta = {
  id: string;
  deal_id: string;
  deal_title: string;
  investor_id: string;
  operator_id: string;
  other_user: { id: string; name: string };
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [convo, setConvo] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load conversation + messages
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const res = await fetch(`/api/conversations/${id}/messages`);
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.conversation) {
        router.push("/messages");
        return;
      }

      setConvo(json.conversation);
      setMessages(json.messages ?? []);
      setLoading(false);
    })();
  }, [id, router, supabase]);

  // Auto-scroll on load + new messages
  useEffect(() => {
    if (!loading) {
      setTimeout(scrollToBottom, 100);
    }
  }, [loading, messages.length, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate (in case we already added it optimistically)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if from the other party
          if (newMsg.sender_id !== userId) {
            fetch(`/api/conversations/${id}/messages`).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId, supabase]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.message.id)) return prev;
          return [...prev, json.message];
        });
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[--text-muted]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-[--border] bg-[--bg-card] px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push("/messages")}
          className="text-[--text-muted] hover:text-[--text-primary] transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">
            {convo?.other_user.name}
          </div>
          {convo?.deal_title && (
            <Link
              href={`/deals/${convo.deal_id}`}
              className="text-xs text-teal-400 hover:text-teal-300 transition truncate block"
            >
              {convo.deal_title}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-1"
      >
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === userId;
          const showDate =
            i === 0 ||
            !isSameDay(messages[i - 1].created_at, msg.created_at);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="text-[11px] text-[--text-muted] bg-[--bg-elevated] px-3 py-1 rounded-full">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              )}
              <div
                className={[
                  "flex mb-2",
                  isMine ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isMine
                      ? "bg-teal-500 text-white rounded-br-md"
                      : "bg-[--bg-input] border border-[--border] text-[--text-primary] rounded-bl-md",
                  ].join(" ")}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p
                    className={[
                      "text-[10px] mt-1",
                      isMine ? "text-teal-100/70" : "text-[--text-muted]",
                    ].join(" ")}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[--border] bg-[--bg-card] px-6 py-4 shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted] resize-none max-h-32"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={[
              "rounded-xl p-3 transition-all shrink-0",
              input.trim() && !sending
                ? "bg-teal-500 text-white hover:bg-teal-600"
                : "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed",
            ].join(" ")}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
