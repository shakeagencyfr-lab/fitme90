"use client";

import { useState } from "react";
import { EquipmentPicker } from "@/components/equipment-picker";

/** Enveloppe cliente du bac à sable : le sélecteur a besoin d'un état. */
export function EquipmentPickerPreview() {
  const [chosen, setChosen] = useState(new Set(["presse-cuisses", "halteres", "rameur"]));
  return (
    <div className="min-h-dvh bg-surface p-6">
      <EquipmentPicker
        chosen={chosen}
        onToggle={(item) =>
          setChosen((c) => {
            const n = new Set(c);
            if (n.has(item.key)) n.delete(item.key);
            else n.add(item.key);
            return n;
          })
        }
        onFreeText={() => {}}
        onClose={() => {}}
      />
    </div>
  );
}
