# Protection des données

Ce document est la partie du RGPD qui se tient dans le dépôt : le registre des
traitements (article 30), la conduite à tenir en cas de violation de données
(article 33), et ce qui reste à faire hors du code.

Il s'adresse à l'éditeur de la plateforme. Les documents destinés aux personnes
concernées sont des pages de l'application : `/confidentialite` (article 13),
`/sous-traitance` (l'accord de l'article 28 avec les professionnels), `/ia`
(transparence sur l'IA), `/cgv` et `/mentions-legales`.

## Qui est responsable de quoi

L'application est vendue en marque blanche. Le **professionnel** (coach, salle)
est **responsable du traitement** des données de ses clients : c'est lui qui
décide de les accompagner. L'**éditeur** est son **sous-traitant** : il fournit
l'outil et n'agit que sur instruction. Un revendeur intercalé est
sous-traitant ultérieur.

Conséquence pratique : le registre ci-dessous est celui de l'éditeur en tant que
sous-traitant. **Chaque professionnel doit tenir le sien**, en tant que
responsable. L'accord de sous-traitance le lui rappelle.

## Registre des traitements (article 30)

<!-- registre:debut -->

_Généré depuis `lib/gdpr.ts`. Ne pas modifier à la main : lancer `npm run rgpd`._

### Catégories de données

| Donnée | Table | Finalité | Base légale | Santé | Conservation |
| --- | --- | --- | --- | --- | --- |
| Ton compte | `profiles` | Ton compte : prénom, langue, accès, rattachement à ton coach. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimé avec le compte. |
| Tes accords | `consents` | La trace de ce que tu as accepté, quand, et dans quelle version du texte. | Obligation légale (article 6.1.c) | non | Tant que ton compte existe, comme preuve de ton accord, puis supprimée avec lui : garder une preuve au sujet de quelqu'un qu'on a effacé n'aurait aucun sens. |
| Ton questionnaire | `questionnaires` | Tes réponses : objectif, niveau, pathologies déclarées, allergies, régime. | Consentement explicite, données de santé (articles 6.1.a et 9.2.a) | oui | Pendant la relation, puis supprimé avec le compte. |
| Ton matériel | `equipment` | Le matériel dont tu disposes, pour n'écrire que des exercices faisables. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimé avec le compte. |
| Ton programme | `programs` | Ton programme d'entraînement et ton plan nutritionnel. | Exécution du contrat (article 6.1.b) | oui | Pendant la relation, puis supprimé avec le compte. |
| Tes séances | `session_logs` | Tes séances validées, tes charges et tes répétitions. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimé avec le compte. |
| Tes pesées | `weights` | Tes pesées, telles que tu les as notées au fil du programme. | Consentement explicite, données de santé (articles 6.1.a et 9.2.a) | oui | Pendant la relation, puis supprimé avec le compte. |
| Tes mensurations | `measurements` | Tes mensurations, telles que tu les as notées au fil du programme. | Consentement explicite, données de santé (articles 6.1.a et 9.2.a) | oui | Pendant la relation, puis supprimé avec le compte. |
| Tes photos | `photos` | Les photos que tu as chargées. | Consentement (article 6.1.a) | non | Pendant la relation, puis supprimées avec le compte, fichiers compris. |
| Ton journal alimentaire | `food_log` | Ton journal alimentaire, y compris les produits scannés. | Consentement explicite, données de santé (articles 6.1.a et 9.2.a) | oui | Pendant la relation, puis supprimé avec le compte. |
| Tes recettes gardées | `saved_recipes` | Les recettes que tu as gardées. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimées avec le compte. |
| Ta liste de courses | `shopping_checks` | Ce que tu as coché sur ta liste de courses. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimé avec le compte. |
| Tes conversations avec le Coach IA | `coach_conversations` | Tes conversations avec le Coach IA. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimées avec le compte. |
| Tes messages au Coach IA | `coach_messages` | Le contenu de tes échanges avec le Coach IA, photos comprises. | Exécution du contrat (article 6.1.b) | oui | Pendant la relation, puis supprimé avec le compte. |
| Tes messages à ton coach | `vip_messages` | Tes échanges écrits avec ton coach, quand ton plan les inclut. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimés avec le compte. |
| Les notes de ton coach sur toi | `coach_notes` | Les notes que ton coach a écrites à ton sujet pour préparer ton suivi. | Intérêt légitime (article 6.1.f) | non | Pendant la relation, puis supprimées avec le compte. |
| Les alertes envoyées à ton coach | `coach_notifications` | Les alertes remontées à ton coach à ton sujet (séance manquée, message). | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimées avec le compte. |
| Tes rendez-vous | `bookings` | Tes rendez-vous en présentiel, passés et à venir. | Exécution du contrat (article 6.1.b) | non | Pendant la relation, puis supprimés avec le compte. |
| Tes rappels de séance | `push_subscriptions` | L'abonnement de ton navigateur aux rappels de séance. | Consentement (article 6.1.a) | non | Jusqu'à ce que tu coupes les notifications, ou à la suppression du compte. |
| Tes achats | `orders` | Tes achats : montant, date, offre, référence de paiement. | Obligation légale (article 6.1.c) | non | La vente est conservée pour la comptabilité de ton coach, mais le lien avec ton compte est coupé à la suppression : la ligne ne te désigne plus. |
| Ta consommation de crédits IA | `credit_ledger` | Les crédits IA consommés par tes actions, pour la facturation entre professionnels. | Intérêt légitime (article 6.1.f) | non | 36 mois, pour la facturation entre le coach et son revendeur. |
| Le journal technique de l'IA | `ai_calls` | Le journal technique des appels au modèle : quoi, quand, combien de jetons. | Intérêt légitime (article 6.1.f) | non | 12 mois, pour le suivi des coûts et la détection d'abus. |

### Autres durées

- Prospects du mini-programme gratuit, sans conversion : 36 mois.
- Journal technique des appels au modèle : 12 mois.
- Journal des accès en assistance : 12 mois.
- Preuve d'un consentement, après son retrait : 36 mois.
- Compte inactif, avant proposition de suppression : 24 mois.

### Sous-traitants ultérieurs

| Service | Rôle | Traitement | Transfert hors UE |
| --- | --- | --- | --- |
| Vercel | Hébergement de l'application et exécution des pages. | Union européenne (Paris, cdg1) | Clauses contractuelles types pour le support et la supervision depuis les États-Unis. |
| Supabase | Base de données, authentification, stockage des fichiers. | Union européenne | Clauses contractuelles types pour le support depuis les États-Unis. |
| Anthropic | Génération du programme, réponses du Coach IA, analyse des photos envoyées au chat. | États-Unis | Clauses contractuelles types. Les données ne servent pas à entraîner le modèle. |
| Stripe | Encaissement des paiements. Aucune donnée de carte ne transite par l'application. | Union européenne et États-Unis | Clauses contractuelles types et Data Privacy Framework. |
| Open Food Facts | Fiches produits interrogées au scan d'un code-barres. | Union européenne | Aucun |
| SerpApi | Import de la fiche d'établissement d'un coach, à sa demande. Aucune donnée de client. | États-Unis | Clauses contractuelles types. |

### Consentements recueillis

| Clé | Intitulé |
| --- | --- |
| `cgv` | Conditions générales de vente |
| `confidentialite` | Politique de confidentialité |
| `sante` | Traitement des données de santé |
| `prospection` | Recevoir des conseils et des offres par e-mail |
| `sous-traitance` | Accord de sous-traitance (professionnels) |

Version courante des textes : **2026-09-11**. Âge minimum pour ouvrir un compte seul : **15 ans** (article 8, France).

<!-- registre:fin -->

## Conduite à tenir en cas de violation de données (article 33)

Une violation, ce n'est pas seulement un vol de base : c'est toute destruction,
perte, altération, divulgation ou accès non autorisé. Une clé de service
publiée par erreur dans un dépôt en est une, même si personne ne s'en est servi.

**Le compteur de 72 heures part du moment où on en a CONNAISSANCE**, pas du
moment où on a fini d'enquêter. Ne pas attendre d'avoir tout compris pour
notifier : une notification initiale incomplète, complétée ensuite, est prévue
par le texte.

1. **Contenir, tout de suite.** Révoquer la clé, couper l'accès, invalider les
   sessions. Avant de chercher à comprendre.
2. **Horodater.** Noter l'heure exacte de la prise de connaissance et par quel
   canal. C'est cette heure-là qui fait foi pour les 72 heures.
3. **Qualifier.** Quelles catégories de données, combien de personnes, quelles
   conséquences possibles. Les données de santé (questionnaire, pathologies,
   mesures) font monter le risque d'un cran : elles relèvent de l'article 9.
4. **Prévenir les professionnels concernés sans délai injustifié**, avec ce
   qu'on sait. Ce sont EUX les responsables du traitement : c'est à eux de
   notifier la CNIL dans les 72 heures, et l'éditeur doit leur en donner les
   moyens (article 33.2).
5. **Prévenir les personnes** lorsque le risque est élevé pour leurs droits
   (article 34), en termes clairs, sans jargon.
6. **Consigner**, même quand aucune notification n'était requise : l'article
   33.5 impose de documenter toute violation, y compris celles qu'on a jugé
   inutile de notifier, et de pouvoir montrer le raisonnement.

Modèle de consignation, une entrée par incident :

```
Date et heure de connaissance :
Canal de découverte :
Nature de la violation :
Catégories et volume de données :
Personnes concernées (nombre, profils) :
Conséquences probables :
Mesures de confinement (heure) :
Professionnels prévenus (heure, moyen) :
Personnes prévenues (oui/non, justification) :
Notification CNIL (par qui, heure, numéro de récépissé) :
Mesures correctives :
```

## Ce qui est appliqué par le code

- **Cloisonnement** par utilisateur et par espace (Row Level Security), testé
  (`lib/tenant-isolation.test.ts`).
- **Registre unique** dans `lib/gdpr.ts` : l'export, la page de
  confidentialité, l'accord de sous-traitance et ce document le lisent tous.
  Un test échoue si une table contient `user_id` ou `client_id` sans y figurer.
- **Accès et portabilité** (articles 15 et 20) : `/api/export` produit le
  dossier complet, y compris les notes écrites par le coach.
- **Effacement** (article 17) : suppression du compte, des données et des
  fichiers depuis le profil.
- **Preuve des consentements** (article 7.1) : table `consents`, écrite côté
  serveur, lisible par la personne dans « Mes données ».
- **Retrait aussi simple que l'accord** (article 7.3) : un bouton dans
  « Mes données », et le retrait de l'accord santé ARRÊTE réellement la
  génération et le Coach IA.
- **Durées de conservation** (article 5.1.e) : `lib/retention-purge.ts`, passé
  chaque jour par le cron. **Dry-run tant que `ENABLE_RETENTION_PURGE` ≠ `1`** :
  la réponse du cron dit ce qui serait supprimé, à lire avant d'activer.
- **Journalisation des accès en assistance** d'un professionnel au compte d'un
  client, et bandeau permanent pendant l'accès.
- **Aucun traceur** : les seuls cookies sont la session, la langue et le retour
  d'assistance, tous exemptés de consentement (article 82 LIL).

## Ce qui reste à faire, hors du code

Ces points ne se règlent pas en écrivant des lignes : ils demandent une
décision ou une signature.

- [ ] **Identité de l'éditeur** dans `/mentions-legales` : raison sociale,
      forme, capital, RCS, siège, directeur de publication, hébergeur.
- [ ] **Contrats de sous-traitance signés** avec Vercel, Supabase, Anthropic et
      Stripe (leurs DPA standard sont à accepter, pas à rédiger).
- [ ] **Analyse d'impact (article 35)** : traitement de données de santé à
      grande échelle, c'est le cas typique où elle devient obligatoire. À
      conduire avant d'atteindre un volume significatif, pas après.
- [ ] **Désignation d'un DPO** si l'activité l'impose (article 37).
- [ ] **Relecture juridique** de `/cgv`, `/confidentialite` et
      `/sous-traitance`. Le bandeau « Brouillon » reste sur ces pages tant
      qu'elle n'a pas eu lieu.
- [ ] **Registre des professionnels** : chaque coach doit tenir le sien. Leur
      fournir un modèle serait un vrai service.
