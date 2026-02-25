import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string; docId: string }> };

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

  return { user, role: (profile?.role ?? "investor") as string };
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, docId } = await ctx.params;
  const adminClient = createAdminClient();

  // Fetch document
  const { data: doc, error: docErr } = await adminClient
    .from("deal_documents")
    .select("*")
    .eq("id", docId)
    .eq("deal_id", id)
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Fetch deal to check ownership
  const { data: deal } = await adminClient
    .from("deals")
    .select("operator_id")
    .eq("id", id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Only operator who owns the deal or admin
  if (auth.role !== "admin" && deal.operator_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from storage
  await adminClient.storage
    .from("deal-documents")
    .remove([doc.storage_path]);

  // Delete from table
  const { error: delErr } = await adminClient
    .from("deal_documents")
    .delete()
    .eq("id", docId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
