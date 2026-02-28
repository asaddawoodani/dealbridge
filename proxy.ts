import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = new Set(["/", "/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/callback", "/terms", "/privacy", "/disclaimer"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API routes handle their own auth (return JSON errors, not redirects)
  if (pathname.startsWith("/api/")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Allow public routes
  if (PUBLIC_ROUTES.has(pathname)) {
    const { supabaseResponse, user } = await updateSession(request);

    // Redirect logged-in users away from auth pages
    if (user && (pathname === "/auth/login" || pathname === "/auth/signup")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // All other routes require auth
  const { supabaseResponse, user, supabase } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Fetch user profile for role checks
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "investor";

  // Admin routes: only admins
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = role === "operator" ? "/operator/dashboard" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Operator routes: only operators and admins
  if (pathname.startsWith("/operator")) {
    if (role !== "operator" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Portfolio and invest: investor or admin only (but /investors is open to all authenticated users)
  if (pathname.startsWith("/portfolio") || (pathname.startsWith("/invest") && !pathname.startsWith("/investors"))) {
    if (role !== "investor" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/operator/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Dashboard and onboarding: investor or admin
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    if (role !== "investor" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/operator/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
