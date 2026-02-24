import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  emailTemplate,
  sendDealAlertsToInvestors,
  ADMIN_EMAIL,
  type DealRow,
} from "@/lib/email";

// Public: list deals (uses admin client to bypass RLS for public listing)
export async function GET(req: Request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const operatorId = searchParams.get("operator_id");

  let query = admin.from("deals").select("*").order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  } else if (!status) {
    query = query.eq("status", "active");
  }

  if (operatorId) {
    query = query.eq("operator_id", operatorId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deals: data ?? [] });
}

// Admin or Operator: create deal
export async function POST(req: Request) {
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

  const role = profile?.role;

  if (role !== "admin" && role !== "operator") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const admin = createAdminClient();
    const isOperator = role === "operator";

    const { data, error } = await admin
      .from("deals")
      .insert({
        title: body.title ?? "",
        description: body.description ?? null,
        category: body.category ?? null,
        min_check: body.min_check ?? null,
        location: body.location ?? null,
        status: isOperator ? "pending" : (body.status ?? "active"),
        operator_id: isOperator ? user.id : null,
        timeline: body.timeline ?? null,
        tags: body.tags ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const appUrl = new URL(req.url).origin;

    // Operator submitted → notify admin for review
    if (isOperator && data) {
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New deal submitted for review: ${data.title}`,
        html: emailTemplate({
          title: "New Deal Submission",
          body: [
            "An operator has submitted a new deal for review.",
            `<strong>Title:</strong> ${data.title}`,
            data.category ? `<strong>Category:</strong> ${data.category}` : "",
            data.location ? `<strong>Location:</strong> ${data.location}` : "",
            data.min_check ? `<strong>Investment size:</strong> ${data.min_check}` : "",
          ]
            .filter(Boolean)
            .join("<br/>"),
          ctaText: "Review in Admin",
          ctaUrl: `${appUrl}/admin/deals`,
        }),
      }).catch((err: unknown) =>
        console.error("[email] operator deal notification failed:", err)
      );
    }

    // Admin created active deal → alert matching investors
    if (!isOperator && data && data.status === "active") {
      sendDealAlertsToInvestors(data as DealRow, appUrl, admin);
    }

    return NextResponse.json({ deal: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
