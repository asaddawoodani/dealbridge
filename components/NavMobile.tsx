"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

type NavLink = { href: string; label: string; highlight?: boolean };

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-500/15 text-amber-400",
  operator: "bg-purple-500/15 text-purple-400",
  investor: "bg-teal-500/15 text-teal-400",
};

export default function NavMobile({
  links,
  showMessages,
  userName,
  userRole,
}: {
  links: NavLink[];
  showMessages?: boolean;
  userName?: string | null;
  userRole?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const isLoggedIn = links.length > 0;

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 z-50"
            style={{ backgroundColor: 'var(--bg-page)' }}
            onClick={() => setOpen(false)}
          />

          {/* Menu */}
          <div
            className="fixed top-16 left-0 right-0 border-b border-[--border] p-4 space-y-1 z-50"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            {/* User info header (logged in) */}
            {isLoggedIn && userName && (
              <div className="px-4 py-3 mb-1">
                <div className="text-sm font-semibold text-[--text-primary]">{userName}</div>
                {userRole && (
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium mt-1.5 ${ROLE_COLORS[userRole] ?? ROLE_COLORS.investor}`}>
                    {userRole}
                  </span>
                )}
              </div>
            )}

            {/* Brand line (logged out) */}
            {!isLoggedIn && (
              <div className="flex items-center gap-2 px-4 py-3 mb-1">
                <span className="text-sm font-bold text-[--text-primary] font-[family-name:var(--font-heading)]">
                  Deal<span className="text-teal-400">Bridge</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded-full">
                  Beta
                </span>
              </div>
            )}

            {(isLoggedIn || !isLoggedIn) && (
              <div className="border-t border-[--border] my-2" />
            )}

            {/* Nav links */}
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={[
                  "block px-4 py-3 rounded-xl text-sm font-medium hover:bg-[--bg-elevated]",
                  l.highlight
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-[--text-secondary] hover:text-[--text-primary]",
                ].join(" ")}
              >
                {l.label}
              </Link>
            ))}
            {showMessages && (
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
              >
                Messages
              </Link>
            )}

            {/* Theme toggle */}
            <div className="border-t border-[--border] my-2" />
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-[--text-muted]">Theme</span>
              <ThemeToggle />
            </div>

            {/* Sign out (logged in) */}
            {isLoggedIn && (
              <>
                <div className="border-t border-[--border] my-2" />
                <button
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    setOpen(false);
                    window.location.href = "/auth/login";
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:text-red-400 hover:bg-[--bg-elevated]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            )}

            {/* Auth links (logged out) */}
            {!isLoggedIn && (
              <>
                <div className="border-t border-[--border] my-2" />
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-teal-400 hover:text-teal-300 hover:bg-[--bg-elevated]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
