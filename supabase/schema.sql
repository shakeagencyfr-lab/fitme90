-- FitMe90 — schéma Supabase
-- À exécuter dans l'éditeur SQL du projet. Région UE obligatoire (données de santé).
--
-- Durcissements par rapport au handoff d'origine :
--   1. `start_date` reste NULL à l'inscription et n'est posée qu'à la GÉNÉRATION
--      du programme, par le serveur (service role). Le compte à rebours des
--      90 jours démarre donc à la génération, pas à la création du compte.
--   2. `start_date` ET `paid` sont retirés des droits d'écriture du client
--      (privilèges par colonne) : sinon un client pourrait réinitialiser son
--      compteur ou se déclarer payé.
--   3. `ai_calls` (compteur de rate limit / coûts) n'a AUCUNE politique client :
--      seul le serveur (service role) y écrit et le lit. Sans ça, un client
--      pourrait supprimer ses lignes pour contourner les plafonds d'appels.

-- ---------------------------------------------------------------- profils
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  name        text,
  sex         text,
  age         int,
  height_cm   numeric,
  rest_hr     int,
  paid        boolean not null default false,
  photo_consent_at timestamptz,          -- consentement explicite photos corporelles
  medical_hold boolean not null default false, -- exclusion médicale (voir lib/screening.ts)
  start_date  date,                       -- posée à la génération, par le serveur
  created_at  timestamptz not null default now()
);

-- réponses au questionnaire, gardées brutes : le questionnaire évoluera
create table public.questionnaires (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  answers     jsonb not null,
  train_days  text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- matériel
create table public.equipment (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  confidence  text,
  enabled     boolean not null default true,
  source      text not null default 'photo'   -- 'photo' | 'manuel'
);

-- ------------------------------------------------------------- programme
create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  plan        jsonb not null,        -- summary, cycles, weekPlan, session, nutrition
  version     int not null default 1,
  model       text,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- journal
create table public.session_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  day         int not null check (day between 1 and 90),
  volume      numeric,
  sets_done   int,
  entries     jsonb,                 -- détail série par série
  validated_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.weights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  kg          numeric not null,
  measured_at date not null default current_date
);

create table public.measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  waist numeric, hips numeric, chest numeric, thigh numeric, arm numeric,
  measured_at date not null default current_date
);

create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  storage_path text not null,        -- body-photos/{user_id}/{uuid}.jpg
  kind        text not null default 'progress',  -- 'progress' | 'gym'
  taken_at    date not null default current_date
);

-- conversations avec le coach : plusieurs fils, listables et consultables
create table public.coach_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null default 'Nouvelle conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.coach_conversations (user_id, updated_at desc);

create table public.coach_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  conversation_id uuid references public.coach_conversations(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index on public.coach_messages (conversation_id, created_at);

-- liste des courses : uniquement l'état coché, la liste elle-même est recalculée
create table public.shopping_checks (
  user_id     uuid not null references auth.users on delete cascade,
  item_key    text not null,
  primary key (user_id, item_key)
);

-- abonnements Web Push (rappels de séance, relances). Une ligne par appareil
-- (endpoint unique). Le client écrit SA ligne (RLS own_rows) ; l'envoi se fait
-- côté serveur en service role (cron). `endpoint` est la clé : un même appareil
-- qui se ré-abonne écrase proprement l'ancienne entrée.
create table public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

-- compteur d'appels au modèle, sert au rate limit et au suivi des coûts
create table public.ai_calls (
  id          bigserial primary key,
  user_id     uuid not null references auth.users on delete cascade,
  route       text not null,
  input_tokens int,
  output_tokens int,
  created_at  timestamptz not null default now()
);
create index on public.ai_calls (user_id, route, created_at desc);

-- ------------------------------------------------------------------ RLS
-- Sans ces politiques, la clé anon publique donne accès à toute la base.
-- On applique une politique « ses propres lignes » à toutes les tables
-- possédées par l'utilisateur, SAUF profiles (clé = id) et ai_calls
-- (serveur uniquement, traité plus bas).
do $$
declare t text;
begin
  foreach t in array array[
    'questionnaires','equipment','programs','session_logs',
    'weights','measurements','photos','coach_messages','shopping_checks',
    'push_subscriptions','coach_conversations'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$create policy "own_rows" on public.%I
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id)$f$, t);
  end loop;
end $$;

-- profiles : lecture et mise à jour de SA ligne uniquement.
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- (pas de politique insert : le trigger handle_new_user s'en charge)

-- Verrou par colonne : le client ne peut écrire QUE ces champs de profil.
-- `paid`, `start_date`, `medical_hold` restent hors de sa portée : seul le
-- serveur (service role, qui contourne ces droits) les modifie.
revoke update on public.profiles from authenticated, anon;
grant update (name, sex, age, height_cm, rest_hr, photo_consent_at)
  on public.profiles to authenticated;

-- ai_calls : verrouillé côté client. RLS activé SANS aucune politique =
-- refus total pour anon/authenticated. Le serveur y accède en service role.
alter table public.ai_calls enable row level security;
revoke all on public.ai_calls from authenticated, anon;

-- ---------------------------------------------------------- profil auto
-- start_date volontairement NON renseignée ici (posée à la génération).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- stockage
-- Bucket `body-photos`, PRIVÉ. Politiques par préfixe user_id/.
insert into storage.buckets (id, name, public) values ('body-photos','body-photos', false)
  on conflict (id) do nothing;

create policy "photos_own_folder" on storage.objects for all
  to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------- codes cadeaux
-- Codes offrant le programme (débloquent paid=true sans paiement).
-- Usage unique : `used_by` est renseigné à l'utilisation. Verrouillé côté
-- client (aucune policy) — seul le serveur (service role) lit/écrit, sinon
-- on pourrait énumérer les codes.
create table public.gift_codes (
  code        text primary key,
  note        text,                 -- à qui / pourquoi (usage interne)
  used_by     uuid references auth.users on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.gift_codes enable row level security;
revoke all on public.gift_codes from authenticated, anon;

-- Exemple d'ajout d'un code (à faire côté serveur / éditeur SQL) :
--   insert into public.gift_codes (code, note) values ('MON-CODE', 'cadeau Léa');

-- Vérification (BUILD_PLAN étape 2) : connecte-toi avec deux comptes de test
-- et confirme qu'aucun ne voit les lignes ni les fichiers de l'autre.
-- Ne pas sauter cette étape.

-- ------------------------------------------------------------- config coach
-- Configuration globale de la génération (singleton). Le coach choisit, depuis
-- le dashboard admin, de laisser l'IA décider (base evidence-based) ou de
-- personnaliser la méthodologie. Aucune policy : seul le service role y accède.
create table if not exists public.coach_config (
  id                 boolean primary key default true,
  generation_mode    text not null default 'auto',
  custom_methodology text not null default '',
  updated_at         timestamptz not null default now(),
  constraint coach_config_singleton check (id = true),
  constraint coach_config_mode check (generation_mode in ('auto','custom'))
);
alter table public.coach_config enable row level security;
insert into public.coach_config (id) values (true) on conflict (id) do nothing;
