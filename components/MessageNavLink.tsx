"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MessageNavLink() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/conversations/unread");
        const json = await res.json().catch(() => null);
        if (mounted && json?.count !== undefined) {
          setUnread(json.count);
        }
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  return (
    <Link
      href="/messages"
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] relative"
    >
      Messages
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-teal-500 text-white text-[10px] font-bold leading-none">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
