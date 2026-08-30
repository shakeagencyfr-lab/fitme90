import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { clientBelongsToTenant, listVipMessages, markThreadRead } from "@/lib/vip";
import { VipChat } from "@/components/vip-chat";

export const metadata = { title: "Conversation VIP, Admin FitMe90" };
export const dynamic = "force-dynamic";

export default async function AdminChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) notFound();
  const { id } = await params;

  const client = await clientBelongsToTenant(id, tenantId);
  if (!client) notFound();

  const messages = await listVipMessages(id);
  // Marque comme lus les messages du client à l'ouverture.
  await markThreadRead(id, "coach");

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href="/admin/chat" className="text-[13px] font-medium text-muted-2 hover:text-ink">
          ← Tous les fils
        </Link>
        <h1 className="font-archivo font-extrabold text-[clamp(22px,5vw,30px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {client.name}
        </h1>
        {client.email ? <p className="text-[13px] text-muted-2">{client.email}</p> : null}
      </div>

      <VipChat
        messages={messages}
        me="coach"
        clientId={id}
        emptyHint="Aucun message. Écris le premier mot à ton client."
      />
    </div>
  );
}
