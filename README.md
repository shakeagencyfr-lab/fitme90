# FitMe90

Programme de sport et de nutrition personnalisé sur 90 jours (190 €, paiement
unique), conçu par un coach professionnel diplômé d'État. Questionnaire → photos de la
salle → génération par un modèle Claude → espace client (séance guidée,
nutrition, agenda, suivi, coach conversationnel).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth,
Storage, région UE) · Stripe Checkout · SDK Anthropic (serveur uniquement) ·
Vercel (région `cdg1`).

## Cycle de vie de l'accès

- **J1–90** : programme actif, coach IA disponible, séances loggables.
- **J91–120** : plan consultable en lecture seule, coach désactivé.
- **J121+** : accès verrouillé.

Le décompte démarre à la génération du programme. Tout est contrôlé côté serveur
(`lib/access.ts`), jamais par un simple masquage côté client.

## Garde-fous

- **Exclusion médicale** (`lib/screening.ts`) : pathologie, grossesse, traitement
  déclaré → génération bloquée, renvoi vers un professionnel de santé. Appliquée
  au questionnaire ET dans `/api/generate`.
- **Sécurité base** : Row Level Security par utilisateur ; `paid`, `start_date` et
  `ai_calls` inaccessibles en écriture au client (service role uniquement).
- **Rate limits** : génération 3, coach 60/j, recettes 20/j, analyse salle 10.
- **Secrets** : uniquement côté serveur, jamais `NEXT_PUBLIC_`.
- **En-têtes** : CSP, HSTS, X-Frame-Options DENY, etc. (`next.config.ts`).

## Développement

```bash
npm install
cp .env.example .env.local   # renseigner les clés
npm run dev
npm test                     # tests nutrition + exclusion médicale
npm run build && npm run lint
```

## Structure

- `lib/` — logique métier : `access`, `nutrition` (+ tests), `screening`
  (+ tests), `program`, `ratelimit`, `guard`, clients Supabase/Anthropic/Stripe.
- `app/api/` — routes serveur : generate, coach, recipes, analyze-gym, pdf,
  checkout, stripe/webhook, export.
- `app/` — landing, auth, funnel (questionnaire/salle/génération), espace client
  (`/app/*`), pages légales.
- `supabase/schema.sql` — schéma, RLS, bucket privé.

## Déploiement

Voir **[DEPLOY.md](./DEPLOY.md)** — comptes externes, clés, application du schéma,
config Vercel, recette Stripe test, et ce qui reste à faire (relecture juridique,
sauvegardes, SMTP).
