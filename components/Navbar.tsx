import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "./UserMenu";
import NavMobile from "./NavMobile";

async function getNavData() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { role: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return { role: profile?.role ?? "investor" };
  } catch {
    return { role: null };
  }
}

type NavLink = { href: string; label: string };

function getLinks(role: string | null): NavLink[] {
  if (!role) return [];

  if (role === "admin") {
    return [
      { href: "/admin/deals", label: "Admin" },
      { href: "/deals", label: "Deals" },
    ];
  }

  if (role === "operator") {
    return [
      { href: "/operator/dashboard", label: "My Deals" },
      { href: "/deals", label: "Browse Deals" },
    ];
  }

  // investor
  return [
    { href: "/deals", label: "Deals" },
    { href: "/dashboard", label: "Dashboard" },
  ];
}

export default async function Navbar() {
  const { role } = await getNavData();
  const links = getLinks(role);

  return (
    <nav className="sticky top-0 z-50 border-b border-[--border] bg-[--bg-page]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
          <span className="text-lg font-bold tracking-tight font-[family-name:var(--font-heading)]">
            Dealbridge
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-all"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {role ? (
            <>
              <div className="hidden md:block">
                <UserMenu />
              </div>
              <NavMobile links={links} />
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition hidden sm:block"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-xl bg-teal-500 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-600 transition-all"
              >
                Get Started
              </Link>
              <NavMobile links={[]} />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
