import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { listCoachVipThreads } from "@/lib/vip";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Chat VIP, Admin FitMe90" };
export const dynamic = "force-dynamic";

const fmtWhen = (d: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default async function AdminChatPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const threads = tenantId ? await listCoachVipThreads(tenantId) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Chat VIP
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Tes échanges directs avec les clients qui ont une offre « Chat VIP ». Configure tes e-mails de notification dans l&apos;onglet Notifications.
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : threads.length === 0 ? (
        <Alert tone="info">
          Aucun client VIP pour l&apos;instant. Active l&apos;option « Chat VIP » sur une offre (onglet Ma page) : les clients qui l&apos;achètent apparaîtront ici.
        </Alert>
      ) : (
        <div className="flex flex-col gap-2.5">
          {threads.map((t) => (
            <Link key={t.clientId} href={`/admin/chat/${t.clientId}`} className="tap block">
              <Card className="flex items-center justify-between gap-3 hover:border-ink">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-archivo font-bold text-[15.5px] text-ink">{t.name}</span>
                    {t.unread > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                        {t.unread}
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate text-[13px] text-muted">
                    {t.lastAt
                      ? `${t.lastSender === "coach" ? "Toi : " : ""}${t.lastImage && !t.lastBody ? "📷 Photo" : t.lastBody ?? ""}`
                      : "Pas encore de message"}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-2">{fmtWhen(t.lastAt)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
