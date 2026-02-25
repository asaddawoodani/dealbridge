"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type NavLink = { href: string; label: string; highlight?: boolean };

export default function NavMobile({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 border-b border-[--border] bg-[--bg-page]/95 backdrop-blur-xl p-4 space-y-1 z-50">
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
      )}
    </div>
  );
}
