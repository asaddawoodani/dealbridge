import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, emailTemplate } from "@/lib/email";
import { sendAdminNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine redirect based on role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        const role = profile?.role ?? "investor";
        const name = profile?.full_name ?? "there";

        // Fire-and-forget welcome email
        const ctaUrl =
          role === "investor"
            ? `${origin}/onboarding`
            : role === "operator"
              ? `${origin}/operator/dashboard`
              : `${origin}/deals`;
        const ctaLabel =
          role === "investor"
            ? "Complete Your Profile"
            : role === "operator"
              ? "Submit Your First Deal"
              : "View Deals";

        sendEmail({
          to: user.email!,
          subject: "Welcome to DealBridge",
          html: emailTemplate({
            title: `Welcome, ${name}!`,
            body: "Thanks for joining DealBridge. We connect investors with curated private deal flow. Get started below.",
            ctaText: ctaLabel,
            ctaUrl,
          }),
        }).catch((err) => console.error("[email] welcome email failed:", err));

        // In-app notification: admin new user
        sendAdminNotification({
          type: "admin_new_user",
          title: "New user signed up",
          message: `${name} (${user.email}) joined as ${role}.`,
          link: "/admin/verifications",
        }).catch(() => {});

        if (role === "admin") {
          return NextResponse.redirect(`${origin}/admin/deals`);
        } else if (role === "operator") {
          return NextResponse.redirect(`${origin}/operator/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login`);
}
