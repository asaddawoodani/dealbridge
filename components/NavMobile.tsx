"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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
            className="fixed inset-0 top-16 bg-slate-900 z-50"
            onClick={() => setOpen(false)}
          />

          {/* Menu */}
          <div className="fixed top-16 left-0 right-0 bg-slate-900 border-b border-slate-700 p-4 space-y-1 z-50">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={[
                  "block px-4 py-3 rounded-xl text-sm font-medium hover:bg-slate-800",
                  l.highlight
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-slate-300 hover:text-white",
                ].join(" ")}
              >
                {l.label}
              </Link>
            ))}
            {showMessages && (
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Messages
              </Link>
            )}
            {links.length === 0 && (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-teal-400 hover:text-teal-300 hover:bg-slate-800"
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
