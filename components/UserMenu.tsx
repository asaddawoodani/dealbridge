"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User, ChevronDown } from "lucide-react";

type Profile = {
  full_name: string | null;
  role: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  operator: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  investor: "bg-teal-500/15 text-teal-400 border-teal-500/30",
};

export default function UserMenu() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  if (!profile) return null;

  const initials = (profile.full_name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-[--border] px-3 py-2 hover:border-[--border-hover] transition-all"
      >
        <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
        <span className="text-sm font-medium text-[--text-primary] hidden sm:block max-w-[120px] truncate">
          {profile.full_name ?? "User"}
        </span>
        <ChevronDown className="h-4 w-4 text-[--text-muted]" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[--border] bg-[--bg-card] shadow-xl z-50">
          <div className="p-3 border-b border-[--border]">
            <div className="text-sm font-medium truncate">{profile.full_name ?? "User"}</div>
            <span
              className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                ROLE_COLORS[profile.role] ?? ROLE_COLORS.investor
              }`}
            >
              {profile.role}
            </span>
          </div>
          <div className="p-1.5">
            <a
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
            >
              <User className="h-4 w-4" />
              Dashboard
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
