import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  // Verify internal call via service role key header
  const authHeader = req.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, type, title, message, link } = body;

  if (!userId || !type || !title || !message) {
    return NextResponse.json(
      { error: "userId, type, title, and message are required" },
      { status: 400 }
    );
  }

  await sendNotification({ userId, type, title, message, link });

  return NextResponse.json({ ok: true });
}
