import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { tenantNotifyEmails } from "@/lib/vip";
import { NotifAdmin } from "@/components/notif-admin";
import { NotifyEmailsForm } from "@/components/notify-emails-form";

export const metadata = { title: "Notifications, Admin" };

export default async function AdminNotificationsPage() {
  const db = createAdminClient();
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  const [{ data }, emails] = await Promise.all([
    db
      .from("scheduled_pushes")
      .select("id, title, body, send_at")
      .is("sent_at", null)
      .order("send_at", { ascending: true })
      .returns<{ id: string; title: string; body: string; send_at: string }[]>(),
    tenantId ? tenantNotifyEmails(tenantId) : Promise.resolve<string[]>([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {tenantId ? <NotifyEmailsForm emails={emails} /> : null}
      <NotifAdmin scheduled={data ?? []} />
    </div>
  );
}
