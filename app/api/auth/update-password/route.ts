import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch last 3 password hashes for this user
    const { data: history } = await admin
      .from("password_history")
      .select("password_hash")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    // Check if the new password matches any of the last 3
    if (history && history.length > 0) {
      for (const entry of history) {
        const matches = await bcrypt.compare(password, entry.password_hash);
        if (matches) {
          return NextResponse.json({ error: "reused" }, { status: 409 });
        }
      }
    }

    // Update password via admin client
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Hash and store in password history (best-effort — don't fail the request if this errors)
    try {
      const hash = await bcrypt.hash(password, 12);
      await admin.from("password_history").insert({
        user_id: user.id,
        password_hash: hash,
      });
    } catch (historyErr) {
      console.error("[update-password] Failed to save password history:", historyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
