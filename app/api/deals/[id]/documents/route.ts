import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_LABELS = [
  "Pitch Deck",
  "Financial Statements",
  "Business Plan",
  "Legal Documents",
  "Other",
];

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

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const adminClient = createAdminClient();

  // Fetch deal
  const { data: deal, error: dealErr } = await adminClient
    .from("deals")
    .select("id, operator_id")
    .eq("id", id)
    .single();

  if (dealErr || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Only operator who owns the deal or admin can upload
  if (auth.role !== "admin" && deal.operator_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileLabel = formData.get("file_label") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!fileLabel || !VALID_LABELS.includes(fileLabel)) {
      return NextResponse.json(
        { error: "Invalid file label" },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type .${ext} is not allowed` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    // Build storage path
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${id}/${Date.now()}-${sanitized}`;

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await adminClient.storage
      .from("deal-documents")
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadErr) {
      return NextResponse.json(
        { error: "Upload failed: " + uploadErr.message },
        { status: 500 }
      );
    }

    // Insert record
    const { data: doc, error: insertErr } = await adminClient
      .from("deal_documents")
      .insert({
        deal_id: id,
        uploaded_by: auth.user.id,
        file_name: file.name,
        file_type: file.type,
        file_label: fileLabel,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (insertErr) {
      // Clean up uploaded file
      await adminClient.storage.from("deal-documents").remove([storagePath]);
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const adminClient = createAdminClient();

  // Fetch deal
  const { data: deal, error: dealErr } = await adminClient
    .from("deals")
    .select("id, operator_id, status")
    .eq("id", id)
    .single();

  if (dealErr || !deal) {
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

  const { data: docs, error } = await adminClient
    .from("deal_documents")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: docs });
}
