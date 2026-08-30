import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { listCoachNotifications, unreadCoachNotifCount } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fil de notifications du coach, en frais (la cloche interroge cette route au
// chargement puis périodiquement, car le layout /admin est mis en cache et ne
// se rafraîchit pas quand un message client arrive).
export async function GET() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) return NextResponse.json({ notifs: [], unread: 0 });
  const [notifs, unread] = await Promise.all([
    listCoachNotifications(tenantId),
    unreadCoachNotifCount(tenantId),
  ]);
  return NextResponse.json({ notifs, unread }, { headers: { "Cache-Control": "no-store" } });
}
