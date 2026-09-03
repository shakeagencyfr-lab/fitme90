"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadMagnetEnabled, setProspectFollowupEnabled, type LeadMagnetState } from "@/app/admin/actions";

/** Les deux réglages de l'écran Prospects partagent le même interrupteur. */
const ACTIONS = {
  lead_magnet_enabled: setLeadMagnetEnabled,
  prospect_followup_enabled: setProspectFollowupEnabled,
} as const;

export function LeadMagnetToggle({
  enabled,
  name = "lead_magnet_enabled",
}: {
  enabled: boolean;
  name?: keyof typeof ACTIONS;
}) {
  const router = useRouter();
  const [state, action] = useActionState(ACTIONS[name], {} as LeadMagnetState);
  const [on, setOn] = useState(enabled);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action}>
      {/* Le checkbox reflète l'état ; on soumet à chaque changement. */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name={name}
          checked={on}
          onChange={(e) => { setOn(e.target.checked); e.currentTarget.form?.requestSubmit(); }}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 rounded-full bg-line-4 transition-colors peer-checked:bg-brand">
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
        </span>
        <span className="text-[14px] font-semibold text-ink">{on ? "Activé" : "Désactivé"}</span>
      </label>
    </form>
  );
}
