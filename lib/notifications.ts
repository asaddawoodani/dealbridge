import { createAdminClient } from "@/lib/supabase/admin";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
};

export async function sendNotification(input: NotificationInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
  });

  if (error) {
    console.error("[notifications] failed to send:", error.message, input);
  }
}

export async function sendAdminNotification(
  input: Omit<NotificationInput, "userId">
) {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  const rows = admins.map((a) => ({
    user_id: a.id,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
  }));

  const { error } = await admin.from("notifications").insert(rows);

  if (error) {
    console.error("[notifications] failed to send admin notification:", error.message);
  }
}
