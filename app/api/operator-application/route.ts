import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status: 400 });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest("Invalid JSON body.");
    }

    const name = String(
      (body as Record<string, unknown>).name ??
        (body as Record<string, unknown>).operator_name ??
        (body as Record<string, unknown>).full_name ??
        ""
    ).trim();

    const email = String((body as Record<string, unknown>).email ?? (body as Record<string, unknown>).operator_email ?? "")
      .trim()
      .toLowerCase();

    const company = String((body as Record<string, unknown>).company ?? (body as Record<string, unknown>).company_name ?? "").trim();

    const website = String((body as Record<string, unknown>).website ?? (body as Record<string, unknown>).company_website ?? "").trim();

    const category = String(
      (body as Record<string, unknown>).category ??
        (body as Record<string, unknown>).business_type ??
        (body as Record<string, unknown>).deal_type ??
        ""
    ).trim();

    const location = String(
      (body as Record<string, unknown>).location ??
        (body as Record<string, unknown>).geo ??
        (body as Record<string, unknown>).geography ??
        ""
    ).trim();

    const summary = String(
      (body as Record<string, unknown>).summary ??
        (body as Record<string, unknown>).description ??
        (body as Record<string, unknown>).notes ??
        ""
    ).trim();

    if (!name) return badRequest("Name is required.");
    if (!email) return badRequest("Email is required.");
    if (!isValidEmail(email)) return badRequest("Please enter a valid email.");
    if (!company) return badRequest("Company name is required.");

    const hp = String((body as Record<string, unknown>).hp ?? "").trim();
    if (hp) return badRequest("Invalid submission.");

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("operator_applications")
      .insert({
        status: "pending",
        name,
        email,
        company,
        website: website || null,
        category: category || null,
        location: location || null,
        summary: summary || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint:
            "Check your operator_applications table has columns: name, email, company, website, category, location, summary, status.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, application: data }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
