import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, formatCurrency } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — Admin actions on a commitment
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, notes } = body;

    const admin = createAdminClient();

    const { data: existing, error: fetchErr } = await admin
      .from("investment_commitments")
      .select("*, deals(id, title)")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    switch (action) {
      case "fund":
        update.status = "funded";
        update.funded_date = new Date().toISOString();
        break;
      case "complete":
        update.status = "completed";
        break;
      case "cancel":
        update.status = "cancelled";
        break;
      case "flag":
        update.notes = `[FLAGGED] ${notes || existing.notes || ""}`.trim();
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (notes && action !== "flag") {
      update.notes = notes;
    }

    const { data, error } = await admin
      .from("investment_commitments")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Email investor on status change
    if (update.status) {
      const { data: investorProfile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", existing.investor_id)
        .single();

      if (investorProfile?.email) {
        const appUrl = new URL(req.url).origin;
        const deal = existing.deals as { title: string } | null;
        sendEmail({
          to: investorProfile.email,
          subject: `Investment status update: ${deal?.title ?? "Deal"}`,
          html: emailTemplate({
            title: "Investment Status Update",
            body: [
              `Your investment in <strong>${deal?.title ?? "a deal"}</strong> has been updated.`,
              `<strong>New status:</strong> ${update.status}`,
              `<strong>Amount:</strong> ${formatCurrency(existing.amount)}`,
              notes ? `<strong>Notes:</strong> ${notes}` : "",
            ]
              .filter(Boolean)
              .join("<br/>"),
            ctaText: "View Portfolio",
            ctaUrl: `${appUrl}/portfolio`,
          }),
        }).catch((err: unknown) => console.error("[email] admin action notify failed:", err));
      }
    }

    return NextResponse.json({ ok: true, commitment: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
