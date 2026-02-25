import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDealAlertsToInvestors, type DealRow } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get investor count for this deal
  const { count: investorCount } = await admin
    .from("investment_commitments")
    .select("id", { count: "exact", head: true })
    .eq("deal_id", id)
    .in("status", ["committed", "funded", "completed"]);

  return NextResponse.json({ deal: data, investor_count: investorCount ?? 0 });
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role ?? "investor" };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { user, role } = auth;

  try {
    const body = await req.json();
    const adminClient = createAdminClient();

    if (role === "admin") {
      const { data, error } = await adminClient
        .from("deals")
        .update(body)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Admin approved a deal → send investor alerts
      if (body.status === "active" && data) {
        const appUrl = new URL(req.url).origin;
        sendDealAlertsToInvestors(data as DealRow, appUrl, adminClient);
      }

      return NextResponse.json({ deal: data });
    }

    if (role === "operator") {
      // Operators cannot change status or operator_id
      const { status, operator_id, ...safeBody } = body;

      const { data, error } = await adminClient
        .from("deals")
        .update(safeBody)
        .eq("id", id)
        .eq("operator_id", user.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ deal: data });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("deals").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
