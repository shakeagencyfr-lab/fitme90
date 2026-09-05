import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_HOST } from "@/lib/config";
import { tenantCapacity } from "@/lib/entitlements";

/**
 * Comptes clients INTERNES : créés et tenus par le coach, sans adresse e-mail.
 *
 * Une salle inscrit des adhérents qui n'installeront jamais l'application et
 * qui paient au comptoir. Leur imposer un compte, une adresse et un paiement en
 * ligne, c'est leur demander de faire un travail qu'ils n'ont pas demandé, et
 * c'est demander au coach de renoncer à l'outil pour la moitié de sa clientèle.
 * Le coach saisit donc à leur place, et l'adresse arrive plus tard, le jour où
 * l'adhérent veut prendre la main lui-même.
 *
 * Trois invariants tiennent le tout :
 *
 *   1. Le compte EXISTE côté authentification. Tout le schéma pointe vers
 *      `auth.users` (programme, questionnaire, séances, pesées) : un client
 *      sans utilisateur auth serait un client sans rien. Il porte donc une
 *      adresse technique, sur un sous-domaine sans MX, que personne ne relève.
 *   2. `profiles.email` reste NULL tant qu'il n'y a pas de vraie adresse. Tous
 *      les envois de l'application partent de ce champ : NULL, c'est zéro
 *      courriel envoyé dans le vide, sans avoir à se souvenir de le vérifier
 *      quelque part.
 *   3. `paid` est vrai dès la création. Le paiement a eu lieu, à la caisse ou
 *      de la main à la main ; Stripe n'a rien à voir là-dedans et ne doit
 *      jamais réclamer quoi que ce soit à cet adhérent.
 */

/**
 * Sous-domaine des adresses techniques.
 *
 * Il n'a pas d'enregistrement MX, donc rien n'y est délivrable, et il porte un
 * nom qui se lit : un opérateur qui tombe dessus dans la console d'auth
 * comprend en une seconde ce qu'il regarde. Un domaine en `.invalid` aurait été
 * plus explicite encore, mais certaines validations d'adresse le refusent, et
 * un compte qu'on ne peut pas créer ne rend service à personne.
 */
export const INTERNAL_EMAIL_DOMAIN = `comptes-internes.${SITE_HOST}`;

/** Vrai si l'adresse est une adresse technique de compte interne. */
export function isInternalAddress(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

/**
 * Fabrique l'adresse technique d'un compte interne.
 *
 * Elle est tirée au hasard et non dérivée du nom : deux « Martin Dupont » dans
 * la même salle ne doivent pas se marcher dessus, et le nom d'un adhérent n'a
 * rien à faire dans une adresse qui traînera dans des journaux techniques.
 */
export function internalAddress(random = crypto.randomUUID()): string {
  return `interne-${random.replace(/-/g, "").slice(0, 20)}@${INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * Normalise une adresse saisie par le coach, ou renvoie null si elle n'est pas
 * une adresse utilisable.
 *
 * Volontairement peu regardante sur la forme (une adresse valide peut être
 * étrange) et très regardante sur une seule chose : elle refuse le domaine
 * technique. Sans ce garde-fou, un coach qui recopie l'adresse affichée dans la
 * console d'auth « donnerait la main » à un client sur une boîte qui n'existe
 * pas, et le client se retrouverait enfermé dehors.
 */
export function realEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return null;
  if (isInternalAddress(email)) return null;
  return email;
}

export interface InternalClientResult {
  ok: boolean;
  error?: string;
  userId?: string;
}

export interface CreateInternalClientInput {
  tenantId: string;
  name: string;
  /** Facultative : sans elle le compte reste tenu par le coach. */
  email?: string;
  /** Offre interne rattachée : elle donne la durée du programme et les options. */
  offerId?: string | null;
  /** Début du programme (AAAA-MM-JJ). Vide = le coach le posera au questionnaire. */
  startDate?: string | null;
}

/** Une date de calendrier, ou null si la saisie n'en est pas une. */
function isoDate(raw: string | null | undefined): string | null {
  const d = (raw ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime()) ? d : null;
}

/**
 * Crée un compte client tenu par le coach.
 *
 * L'ordre compte : on vérifie la place AVANT de créer quoi que ce soit, parce
 * qu'un utilisateur auth créé puis abandonné faute de place resterait là, à
 * occuper une adresse et à fausser les comptes.
 */
export async function createInternalClient(
  input: CreateInternalClientInput,
): Promise<InternalClientResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Donne au moins un nom à ce client." };
  if (name.length > 120) return { ok: false, error: "Ce nom est trop long." };

  // Adresse fournie : on la valide tout de suite. La refuser après avoir créé
  // le compte laisserait un client à moitié inscrit.
  let email: string | null = null;
  if (input.email && input.email.trim()) {
    email = realEmail(input.email);
    if (!email) return { ok: false, error: "Cette adresse e-mail n'est pas valide." };
    const pris = await emailTaken(email);
    if (pris) return { ok: false, error: "Un compte existe déjà avec cette adresse." };
  }

  const cap = await tenantCapacity(input.tenantId);
  if (cap.full) {
    return {
      ok: false,
      error: `Tu as atteint ta limite de ${cap.limit} clients. Passe au palier supérieur pour en ajouter.`,
    };
  }

  const admin = createAdminClient();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: email ?? internalAddress(),
    // Confirmé d'office : sans cela le compte resterait en attente d'un clic
    // dans un courriel que personne ne recevra jamais.
    email_confirm: true,
    // Un mot de passe long, tiré au hasard, qui n'est communiqué à personne :
    // on entre dans ces comptes par lien de connexion, jamais par mot de passe.
    password: crypto.randomUUID() + crypto.randomUUID(),
  });
  if (authErr || !created?.user) {
    return { ok: false, error: "Création du compte impossible. Réessaie dans un instant." };
  }
  const userId = created.user.id;

  // Le déclencheur `handle_new_user` a déjà posé la ligne profils avec
  // l'adresse d'auth. On la reprend : l'adresse technique ne doit pas y rester,
  // c'est ce champ qui commande les envois de courriels.
  const { error: profErr } = await admin
    .from("profiles")
    .update({
      email,
      name,
      tenant_id: input.tenantId,
      role: "client",
      // Le paiement a été encaissé par le coach. Aucun passage par Stripe, et
      // aucune relance de paiement à ce client.
      paid: true,
      managed_by_coach: !email,
      selected_offer_id: input.offerId || null,
      start_date: isoDate(input.startDate),
    })
    .eq("id", userId);
  if (profErr) {
    // Rien à moitié fait : le compte auth part avec la ligne profils (cascade).
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: "Création du compte impossible. Réessaie dans un instant." };
  }

  return { ok: true, userId };
}

/**
 * Une adresse déjà portée par un profil ?
 *
 * Comparaison EXACTE, et pas `ilike` : le tiret bas est un caractère joker en
 * SQL et un caractère courant dans une adresse. « marie_durand@exemple.fr »
 * aurait alors ressemblé à « mariexdurand@exemple.fr », et le coach se serait
 * vu refuser une adresse libre sans comprendre pourquoi. Les adresses sont
 * rangées en minuscules des deux côtés (Supabase le fait à l'inscription,
 * `realEmail` ici), la comparaison stricte suffit donc.
 */
async function emailTaken(email: string, exceptUserId?: string): Promise<boolean> {
  const admin = createAdminClient();
  let q = admin.from("profiles").select("id").eq("email", email).limit(1);
  if (exceptUserId) q = q.neq("id", exceptUserId);
  const { data } = await q.returns<{ id: string }[]>();
  return (data?.length ?? 0) > 0;
}

/**
 * Donne la main au client : son adresse remplace l'adresse technique.
 *
 * À partir de là le compte cesse d'être interne. Il reçoit les courriels de
 * l'application, il se connecte lui-même, et le coach ne « tient » plus rien
 * pour lui. Le paiement, lui, ne change pas : il a été encaissé, ce n'est pas
 * parce que le client prend la main qu'il faut le lui redemander.
 */
export async function attachClientEmail(
  tenantId: string,
  userId: string,
  rawEmail: string,
): Promise<InternalClientResult> {
  const email = realEmail(rawEmail);
  if (!email) return { ok: false, error: "Cette adresse e-mail n'est pas valide." };

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; role: string }>();
  // Même garde que le mode assistance : un client vit dans le tenant de son
  // coach, et seul un client peut être repris de cette façon.
  if (!prof || prof.role !== "client" || prof.tenant_id !== tenantId) {
    return { ok: false, error: "Ce client n'est pas le tien." };
  }
  if (await emailTaken(email, userId)) {
    return { ok: false, error: "Un compte existe déjà avec cette adresse." };
  }

  // L'authentification d'abord : si elle refuse l'adresse (déjà prise par un
  // compte auth sans profil, par exemple), le profil n'a pas bougé et l'écran
  // reste cohérent avec la base.
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });
  if (authErr) {
    return { ok: false, error: "Cette adresse est déjà utilisée par un autre compte." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ email, managed_by_coach: false })
    .eq("id", userId);
  if (error) return { ok: false, error: "Enregistrement impossible. Réessaie." };
  return { ok: true, userId };
}
