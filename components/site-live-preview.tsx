"use client";

import { useEffect, useState } from "react";
import type { PublicSite } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { SiteAtelier } from "@/components/site-templates/site-atelier";
import { SiteNocturne } from "@/components/site-templates/site-nocturne";
import { SiteVitrine } from "@/components/site-templates/site-vitrine";
import { readSiteDraft, SITE_PREVIEW_READY } from "@/lib/site-preview";

/**
 * L'aperçu du mini-site, tel qu'il vit dans l'iframe du studio.
 *
 * Il part de l'état ENREGISTRÉ, rendu par le serveur, puis remplace ce qu'il
 * affiche par le brouillon que le studio lui envoie à chaque frappe. Le coach
 * voit donc sa page réelle avant d'avoir touché à quoi que ce soit, et la voit
 * changer pendant qu'il écrit.
 *
 * Ce composant n'existe QUE sur la route d'aperçu du tableau de bord. La page
 * publique /web/<adresse> ne le monte pas : aucun visiteur ne peut lui parler.
 * Et même ici, l'origine du message est vérifiée, puis son contenu reconstruit
 * champ par champ (lib/site-preview.ts).
 */
export function SiteLivePreview({ initial, locale }: { initial: PublicSite; locale: Locale }) {
  // L'état de départ est celui du serveur. Pas d'effet de resynchronisation :
  // un enregistrement change le jeton d'aperçu, donc la clé de l'iframe, donc
  // recharge cette page entière. Le serveur redevient la source par ce chemin,
  // et pas en écrasant l'état à chaque rendu.
  const [site, setSite] = useState<PublicSite>(initial);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const draft = readSiteDraft(e.data);
      if (!draft) return;
      setSite((s) => ({
        ...s,
        template: draft.template,
        // Les champs vides retombent sur null, comme en base : c'est ce qui
        // déclenche les textes de repli, et l'aperçu doit les montrer aussi.
        intro: draft.intro.trim() || null,
        services: draft.services,
        photos: draft.photos,
        programsTitle: draft.programsTitle.trim() || null,
        programsText: draft.programsText.trim() || null,
        address: draft.address.trim() || null,
        phone: draft.phone.trim() || null,
        websiteUrl: draft.websiteUrl.trim() || null,
        openingHours: draft.openingHours,
      }));
    }
    window.addEventListener("message", onMessage);
    // Le studio a pu émettre avant que l'iframe ait fini de charger : on
    // annonce qu'on est prêt plutôt que d'attendre la prochaine frappe.
    window.parent?.postMessage({ type: SITE_PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const props = { site, locale };
  return site.template === "nocturne" ? (
    <SiteNocturne {...props} />
  ) : site.template === "vitrine" ? (
    <SiteVitrine {...props} />
  ) : (
    <SiteAtelier {...props} />
  );
}
