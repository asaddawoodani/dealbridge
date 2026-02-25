import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — Admin-only: all escrow transactions with commitment/deal/investor details
export async function GET() {
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

  const admin = createAdminClient();

  const { data: escrows, error } = await admin
    .from("escrow_transactions")
    .select("*, investment_commitments:commitment_id(id, amount, funding_status, deal_id, investor_id, deals(title))")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch investor profiles separately
  const investorIds = [
    ...new Set(
      (escrows ?? [])
        .map((e) => {
          const ic = e.investment_commitments as { investor_id: string } | null;
          return ic?.investor_id;
        })
        .filter(Boolean) as string[]
    ),
  ];

  const { data: profiles } = investorIds.length > 0
    ? await admin.from("profiles").select("id, full_name, email").in("id", investorIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  // Flatten for frontend
  const transactions = (escrows ?? []).map((e) => {
    const ic = e.investment_commitments as {
      id: string;
      amount: number;
      funding_status: string;
      investor_id: string;
      deals: { title: string } | null;
    } | null;

    const investorProfile = ic ? profileMap[ic.investor_id] : null;

    return {
      id: e.id,
      commitment_id: e.commitment_id,
      amount: e.amount,
      status: e.status,
      payment_status: e.payment_status,
      stripe_payment_intent_id: e.stripe_payment_intent_id,
      paid_at: e.paid_at,
      refunded_at: e.refunded_at,
      refund_amount: e.refund_amount,
      created_at: e.created_at,
      commitment: ic
        ? {
            id: ic.id,
            amount: ic.amount,
            funding_status: ic.funding_status,
            deal_title: ic.deals?.title ?? "Unknown",
            investor_name: investorProfile?.full_name ?? "Unknown",
            investor_email: investorProfile?.email ?? "Unknown",
          }
        : null,
    };
  });

  return NextResponse.json({ transactions });
}
