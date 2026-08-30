"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CoachNotif } from "@/lib/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/admin/actions";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// Icône par type de notification.
function NotifIcon({ type }: { type: string }) {
  const path =
    type === "purchase" || type === "subscription" ? (
      <path d="M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2" />
    ) : type === "vip_message" ? (
      <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" />
    ) : (
      <path d="M12 5a5 5 0 0 0-5 5v3l-1.5 2.5h13L17 13v-3a5 5 0 0 0-5-5Zm-2 13a2 2 0 0 0 4 0" />
    );
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-brand/10 text-brand">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {path}
      </svg>
    </span>
  );
}

export function CoachBell({ notifs, unread }: { notifs: CoachNotif[]; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  function markAll() {
    start(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }
  function openNotif(n: CoachNotif) {
    setOpen(false);
    if (!n.read_at) start(() => markNotificationRead(n.id));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="tap relative flex size-10 items-center justify-center rounded-btn border border-line-4 bg-surface text-body-2 hover:border-ink"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4a5 5 0 0 0-5 5v3.5L5.5 15h13L17 12.5V9a5 5 0 0 0-5-5Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button aria-label="Fermer" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 z-50 mt-2 flex max-h-[70vh] w-[min(92vw,360px)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b border-line-2 px-4 py-3">
              <span className="font-archivo font-bold text-[15px] text-ink">Notifications</span>
              {unread > 0 ? (
                <button onClick={markAll} className="text-[12.5px] font-semibold text-brand hover:underline">
                  Tout marquer comme lu
                </button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13.5px] text-muted-2">Aucune notification pour l&apos;instant.</p>
              ) : (
                notifs.map((n) => {
                  const inner = (
                    <div className={["flex gap-3 px-4 py-3", n.read_at ? "" : "bg-brand/5"].join(" ")}>
                      <NotifIcon type={n.type} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold leading-snug text-ink">{n.title}</span>
                        {n.body ? <span className="truncate text-[12.5px] text-muted">{n.body}</span> : null}
                        <span className="text-[11px] text-muted-2">{relTime(n.created_at)}</span>
                      </div>
                      {!n.read_at ? <span className="ml-auto mt-1 size-2 shrink-0 rounded-full bg-brand" /> : null}
                    </div>
                  );
                  return n.url ? (
                    <Link key={n.id} href={n.url} onClick={() => openNotif(n)} className="tap block border-b border-line-2 last:border-0 hover:bg-surface-2">
                      {inner}
                    </Link>
                  ) : (
                    <button key={n.id} onClick={() => openNotif(n)} className="tap block w-full border-b border-line-2 text-left last:border-0 hover:bg-surface-2">
                      {inner}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
