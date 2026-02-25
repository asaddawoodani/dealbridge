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
    .select("role, verification_status")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: (profile?.role ?? "investor") as string,
    verificationStatus: (profile?.verification_status ?? "unverified") as string,
  };
}

export async function GET(_req: Request, ctx: Ctx) {
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

  // Fetch deal
  const { data: deal } = await adminClient
    .from("deals")
    .select("operator_id, status")
    .eq("id", id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Access: admin always, operator owns deal, verified investor + active deal
  const isAdmin = auth.role === "admin";
  const isOwner = deal.operator_id === auth.user.id;
  const isVerifiedInvestor =
    auth.verificationStatus === "verified" && deal.status === "active";

  if (!isAdmin && !isOwner && !isVerifiedInvestor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate signed URL (5 minutes)
  const { data: signed, error: signErr } = await adminClient.storage
    .from("deal-documents")
    .createSignedUrl(doc.storage_path, 300);

  if (signErr || !signed) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signed.signedUrl,
    file_name: doc.file_name,
  });
}
