import { createAdminClient } from "@/lib/supabase/admin";
import { NotifAdmin } from "@/components/notif-admin";

export const metadata = { title: "Notifications, Admin" };

export default async function AdminNotificationsPage() {
  const db = createAdminClient();
  const { data } = await db
    .from("scheduled_pushes")
    .select("id, title, body, send_at")
    .is("sent_at", null)
    .order("send_at", { ascending: true })
    .returns<{ id: string; title: string; body: string; send_at: string }[]>();
  return <NotifAdmin scheduled={data ?? []} />;
}
