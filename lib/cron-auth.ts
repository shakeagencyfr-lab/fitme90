import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Un appel de cron est autorisé s'il porte le secret, et seulement alors.
 *
 * Vercel envoie « Authorization: Bearer <CRON_SECRET> » à chaque passage.
 * Sans secret configuré, la porte reste FERMÉE : une variable oubliée sur un
 * nouveau déploiement ne doit pas transformer les crons (facturation, envoi
 * de notifications, résumés IA payants) en routes publiques.
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
