"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

type PendingInterest = {
  id: string;
  deal_title: string;
};

export default function AcceptIntroButton({
  pendingInterests,
}: {
  pendingInterests: PendingInterest[];
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (interestId: string) => {
    setAccepting(interestId);
    setError(null);

    try {
      const res = await fetch(`/api/interests/${interestId}/accept`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Failed to accept introduction");
        return;
      }

      setAccepted((prev) => new Set(prev).add(interestId));

      // Reload to show full profile
      setTimeout(() => router.refresh(), 500);
    } catch {
      setError("Failed to accept introduction");
    } finally {
      setAccepting(null);
    }
  };

  if (pendingInterests.length === 0) return null;

  return (
    <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-1">Pending Introductions</h3>
      <p className="text-sm text-[--text-muted] mb-4">
        Accept to unlock this investor&apos;s full profile and start messaging.
      </p>

      <div className="space-y-3">
        {pendingInterests.map((interest) => {
          const isAccepted = accepted.has(interest.id);
          const isAccepting = accepting === interest.id;

          return (
            <div
              key={interest.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[--bg-input] border border-[--border]"
            >
              <span className="text-sm font-medium truncate">
                {interest.deal_title}
              </span>

              {isAccepted ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Accepted
                </span>
              ) : (
                <button
                  onClick={() => handleAccept(interest.id)}
                  disabled={isAccepting}
                  className="rounded-lg bg-teal-500 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 flex items-center gap-2 shrink-0"
                >
                  {isAccepting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Accept
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}
    </div>
  );
}
