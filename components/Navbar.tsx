import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "./UserMenu";
import NavMobile from "./NavMobile";
import MessageNavLink from "./MessageNavLink";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./notifications/NotificationBell";

async function getNavData() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { role: null, verificationStatus: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, verification_status")
      .eq("id", user.id)
      .single();

    return {
      role: profile?.role ?? "investor",
      verificationStatus: profile?.verification_status ?? "unverified",
    };
  } catch {
    return { role: null, verificationStatus: null };
  }
}

type NavLink = { href: string; label: string; highlight?: boolean };

function getLinks(role: string | null, verificationStatus: string | null): NavLink[] {
  if (!role) return [];

  if (role === "admin") {
    return [
      { href: "/admin/deals", label: "Admin" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/verifications", label: "Verifications" },
      { href: "/admin/compliance", label: "Compliance" },
      { href: "/admin/investments", label: "Investments" },
      { href: "/deals", label: "Deals" },
    ];
  }

  const needsVerify = verificationStatus !== "verified" && verificationStatus !== "pending";

  if (role === "operator") {
    const links: NavLink[] = [
      { href: "/operator/dashboard", label: "My Deals" },
      { href: "/deals", label: "Browse Deals" },
    ];
    if (needsVerify) {
      links.push({ href: "/operator/verify", label: "Verify", highlight: true });
    }
    return links;
  }

  // investor
  const links: NavLink[] = [
    { href: "/deals", label: "Deals" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/profile", label: "Profile" },
  ];
  if (needsVerify) {
    links.push({ href: "/verify", label: "Verify", highlight: true });
  }
  return links;
}

export default async function Navbar() {
  const { role, verificationStatus } = await getNavData();
  const links = getLinks(role, verificationStatus);

  return (
    <nav className="sticky top-0 z-50 border-b border-[--border] bg-[--bg-page]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="DealBridge" width={38} height={38} priority />
          <span className="text-lg font-bold tracking-tight font-[family-name:var(--font-heading)]">
            Deal<span className="text-teal-400">Bridge</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded-full">
            Beta
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={[
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                l.highlight
                  ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]",
              ].join(" ")}
            >
              {l.label}
            </Link>
          ))}
          {role && <MessageNavLink />}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {role && <NotificationBell />}
          {role ? (
            <>
              <div className="hidden md:block">
                <UserMenu />
              </div>
              <NavMobile links={links} showMessages />
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
