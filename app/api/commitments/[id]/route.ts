import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplate, formatCurrency } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

// GET — Single commitment with joined data
export async function GET(_req: Request, ctx: Ctx) {
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

  const role = profile?.role ?? "investor";
  const admin = createAdminClient();

  const { data: commitment, error } = await admin
    .from("investment_commitments")
    .select("*, deals(id, title, category, min_check, target_raise, total_committed, operator_id), profiles:investor_id(full_name, email)")
    .eq("id", id)
    .single();

  if (error || !commitment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Access control
  if (role === "investor" && commitment.investor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "operator") {
    const deal = commitment.deals as { operator_id: string | null } | null;
    if (deal?.operator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ commitment });
}

// PATCH — Update commitment status
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

  const role = profile?.role ?? "investor";
  const admin = createAdminClient();

  try {
    const body = await req.json();

    // Fetch existing commitment
    const { data: existing, error: fetchErr } = await admin
      .from("investment_commitments")
      .select("*, deals(id, title, operator_id)")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (role === "investor") {
      // Investors can only cancel their own commitments
      if (existing.investor_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (body.status !== "cancelled") {
        return NextResponse.json({ error: "Investors can only cancel commitments" }, { status: 400 });
      }

      const { data, error } = await admin
        .from("investment_commitments")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ commitment: data });
    }

    if (role === "admin") {
      const update: Record<string, unknown> = {};
      if (body.status) update.status = body.status;
      if (body.notes !== undefined) update.notes = body.notes;
      if (body.status === "funded") update.funded_date = new Date().toISOString();

      const { data, error } = await admin
        .from("investment_commitments")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Email investor on status change
      if (body.status && body.status !== existing.status) {
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
                `Your investment commitment in <strong>${deal?.title ?? "a deal"}</strong> has been updated.`,
                `<strong>New status:</strong> ${body.status}`,
                `<strong>Amount:</strong> ${formatCurrency(existing.amount)}`,
                body.notes ? `<strong>Notes:</strong> ${body.notes}` : "",
              ]
                .filter(Boolean)
                .join("<br/>"),
              ctaText: "View Portfolio",
              ctaUrl: `${appUrl}/portfolio`,
            }),
          }).catch((err: unknown) => console.error("[email] investor status update failed:", err));
        }
      }

      return NextResponse.json({ commitment: data });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
