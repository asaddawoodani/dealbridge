"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string; highlight?: boolean };

export default function NavMobile({
  links,
  showMessages,
}: {
  links: NavLink[];
  showMessages?: boolean;
}) {
  const [open, setOpen] = useState(false);

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
          {/* Backdrop — covers everything below nav */}
          <div
            className="fixed inset-0 top-16 z-50"
            style={{ backgroundColor: '#0B1120' }}
            onClick={() => setOpen(false)}
          />

          {/* Menu */}
          <div
            className="fixed top-16 left-0 right-0 border-b border-[--border] p-4 space-y-1 z-50"
            style={{ backgroundColor: '#111827' }}
          >
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
            {links.length > 0 && (
              <>
                <div className="border-t border-[--border] my-2" />
                <button
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    setOpen(false);
                    window.location.href = "/auth/login";
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-[--bg-elevated]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            )}
            {links.length === 0 && (
              <>
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
