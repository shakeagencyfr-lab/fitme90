# Déploiement FitMe90

Guide de mise en ligne. L'application est construite (Next.js 16 + Supabase +
Stripe + SDK Anthropic). Il reste à **créer les comptes externes, renseigner les
clés, appliquer le schéma, et déployer sur Vercel**. Aucune clé n'est présente
dans le dépôt : tout passe par des variables d'environnement.

> Rappel juridique : les CGV, mentions et politique de confidentialité sont des
> **brouillons à faire relire par un juriste** avant d'encaisser. Vérifie aussi
> ta **carte professionnelle d'éducateur sportif** (diplôme d'État).

---

## 1. Supabase (région UE) — offre gratuite suffisante pour démarrer

1. Crée un projet Supabase en **région UE** (Francfort ou Paris). Obligatoire :
   données de santé.
2. Ouvre l'éditeur SQL et exécute **tout** `supabase/schema.sql`.
3. Vérifie le bucket `body-photos` (créé par le script) : il doit être **privé**.
4. Auth → active **« Confirm email »**. Personnalise les modèles d'e-mail en
   français (confirmation, réinitialisation).
5. Auth → **URL Configuration** : ajoute les URL de redirection autorisées
   (`http://localhost:3000/**` et `https://TON-DOMAINE/**`).
6. Récupère dans *Project Settings → API* :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret — **jamais** préfixé `NEXT_PUBLIC_`)
7. **Vérifie le RLS** (ne pas sauter) : crée deux comptes de test, connecte-toi
   avec chacun, confirme qu'aucun ne lit les lignes ni les fichiers de l'autre.
8. E-mails : l'envoi Auth gratuit est bridé (quelques-uns/heure, « pour tests »).
   Avant d'ouvrir les inscriptions réelles, configure un **SMTP externe** gratuit
   (Resend, Brevo…) dans Auth → SMTP.
9. Sauvegardes : passe en **Supabase Pro (25 $/mois)** dès le premier vrai client
   — c'est la seule dépense non négociable (aucune sauvegarde en gratuit).

## 2. Anthropic

1. Crée une clé API → `ANTHROPIC_API_KEY` (serveur uniquement).
2. Mets une **alerte de dépense** sur la console Anthropic.
3. Modèle par défaut : `claude-opus-5`. Pour réduire le coût sans toucher au code,
   tu peux surcharger par variable d'env (voir §5) :
   `ANTHROPIC_MODEL_GENERATE`, `ANTHROPIC_MODEL_COACH`, `ANTHROPIC_MODEL_RECIPES`,
   `ANTHROPIC_MODEL_ANALYZE` (ex. `claude-sonnet-5`).
4. Plafonds déjà en place : génération 3/utilisateur, coach 60/jour, recettes
   20/jour, analyse salle 10 au total.

## 3. Stripe

1. En **mode test** d'abord. Récupère `STRIPE_SECRET_KEY` (`sk_test_…`).
2. Crée un webhook pointant vers `https://TON-DOMAINE/api/stripe/webhook`,
   événement `checkout.session.completed`. Récupère `STRIPE_WEBHOOK_SECRET`
   (`whsec_…`).
3. En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Le prix (190 €) est fixé dans le code (`lib/config.ts`), pas dans Stripe.

## 5. Variables d'environnement

Copie `.env.example` en `.env.local` pour le dev, puis renseigne les mêmes clés
dans Vercel (**Production + Preview**) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://TON-DOMAINE

# Sous-domaines personnalisés des landings coach (optionnel) : domaine racine
# sans protocole ni www (ex "fitme90.com"). Vide = fonctionnalité inactive.
NEXT_PUBLIC_ROOT_DOMAIN=

# Chiffrement des clés BYOK (Anthropic/Stripe par coach), 32 octets hex :
SECRETS_ENC_KEY=

# Web Push (rappels séance, notifications Chat VIP) — optionnel :
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@fitme90.app

# E-mails de notification Chat VIP (Resend) — optionnel :
# sans clé, les e-mails ne sont simplement pas envoyés (le push reste actif).
RESEND_API_KEY=
RESEND_FROM=FitMe90 <notifications@fitme90.app>
```

`.env.local` n'est jamais commité (voir `.gitignore`). Aucune clé secrète ne doit
être préfixée `NEXT_PUBLIC_`.

## 6. Vercel

1. Importe le dépôt GitHub dans Vercel.
2. Région des fonctions : **`cdg1` (Paris)** — au plus près des données UE.
3. Renseigne les variables d'environnement (§5).
4. `NEXT_PUBLIC_SITE_URL` = ton domaine de production.
5. Déploie. Chaque push sur la branche déploie ; chaque branche donne un aperçu.

## 6 bis. Adresse personnalisée des coachs

Trois niveaux de personnalisation de l'URL de la landing coach :

**a) Adresse par chemin (actif par défaut, aucune config).**
Chaque coach choisit le nom à la FIN de l'adresse dans **Ma page → Adresse
personnalisée** : `tondomaine.com/<nom>` (au lieu de `.../c/<slug>`). Le
`proxy.ts` réécrit tout segment de 1er niveau non réservé vers `/c/<nom>`, résolu
par `slug` **ou** `subdomain`. La liste des segments réservés (routes de l'app)
est dans `lib/config.ts` (`RESERVED_PATH_SEGMENTS`) : à tenir à jour si on ajoute
une route de 1er niveau.

**b) Sous-domaine (optionnel).**
La même adresse marche aussi en sous-domaine (`<nom>.tondomaine.com`) si :
1. **DNS générique** : enregistrement joker `*.tondomaine.com` (CNAME vers
   `cname.vercel-dns.com`, ou ce que Vercel indique).
2. **Vercel → Domains** : ajoute `*.tondomaine.com` au projet.
3. **Variable d'env** : `NEXT_PUBLIC_ROOT_DOMAIN=tondomaine.com` (Production +
   Preview), puis redéploie.

**c) Domaine 100% personnalisé (premium, à venir).**
La tuyauterie est prête : colonne `tenants.custom_domain` + résolution dans
`proxy.ts` (un hôte étranger → landing du coach via `lib/custom-domain.ts`).
Pour activer pour un coach premium : renseigner `custom_domain` sur son tenant,
puis ajouter ce domaine dans **Vercel → Domains** (le coach pointe son DNS vers
Vercel). Requiert `NEXT_PUBLIC_ROOT_DOMAIN` défini (pour distinguer un hôte
étranger). L'activation en libre-service arrivera avec les abonnements premium.

## 7. Recette de bout en bout (mode test Stripe)

1. Inscription → confirmation e-mail → connexion.
2. Paiement test (carte `4242 4242 4242 4242`). Vérifie que le webhook passe
   `profiles.paid = true`.
3. Questionnaire → **teste l'exclusion médicale** : déclare une pathologie
   générale, confirme que la génération est bloquée avec renvoi santé.
4. Profil sain → salle → génération → espace client (séance, nutrition, agenda).
5. Vérifie l'export JSON et la **suppression réelle** du compte (lignes + photos).
6. Bascule Stripe en **live** seulement après cette recette, et passe une vraie
   commande avant d'annoncer quoi que ce soit.

## 8. Ce qui reste de ton ressort

- Faire **relire les CGV / confidentialité / mentions par un juriste**.
- Compléter les mentions légales (SIRET, carte pro, coordonnées).
- Sauvegardes Supabase Pro dès le premier client.
- SMTP externe pour les e-mails transactionnels.
- Alerte de dépense Anthropic.
- (Optionnel) Suivi d'erreurs Sentry, domaine + HTTPS Vercel.

## Vérifs locales

```bash
npm install
npm run build      # build de production
npm run lint       # ESLint
npm test           # tests nutrition + exclusion médicale (Vitest)
```
