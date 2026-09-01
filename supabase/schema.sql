-- FitMe90 — schéma complet de la base (snapshot fidèle de la production).
--
-- Régénéré par introspection du catalogue Postgres. Contrairement à l'ancienne
-- version, ce fichier couvre TOUT le schéma `public` (tenants, plans, offres,
-- crédits, SMTP…), et non plus un sous-ensemble. Il est reproductible tel quel
-- sur une base vierge Supabase (l'ordre respecte les dépendances : tables, puis
-- clés étrangères, index, fonctions, RLS).
--
-- Modèle de sécurité : RLS activé partout. Les tables « données du client »
-- portent une policy `auth.uid() = user_id`. Toutes les autres sont
-- SERVER-ONLY (RLS activé + droits révoqués à anon/authenticated) : seul le
-- service_role y accède, via le code serveur.
--
-- Note : `auth.users` est géré par Supabase (schéma auth). Les FK vers
-- auth.users(id) supposent donc une base Supabase.

-- =====================================================================
-- 1. TABLES (colonnes uniquement — les clés étrangères sont ajoutées plus bas)
-- =====================================================================

create table if not exists public.tenants (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  name text not null,
  plan text not null default 'starter'::text,
  status text not null default 'active'::text,
  created_at timestamptz not null default now(),
  stripe_account_id text,
  stripe_charges_enabled boolean not null default false,
  commission_bps integer,
  brand_color text,
  tagline text,
  headline text,
  logo_url text,
  favicon_url text,
  about_enabled boolean not null default false,
  about_title text,
  about_text text,
  about_photo_url text,
  notify_emails text[] not null default '{}'::text[],
  subdomain text,
  custom_domain text,
  client_limit integer default 1,
  parent_id uuid,
  kind text not null default 'coach'::text,
  plan_id uuid,
  sub_id text,
  sub_status text,
  sub_current_period_end timestamptz,
  sub_synced_at timestamptz,
  sub_cancel_at_period_end boolean not null default false,
  landing_template text not null default 'onyx'::text,
  ai_mode text not null default 'byok'::text,
  ai_client_daily_limit integer not null default 60,
  ai_credit_price_cents integer not null default 40,
  ai_program_credits integer not null default 5,
  ai_program_credit_price_cents integer not null default 200,
  reseller_model text not null default 'subscription'::text,
  whitelabel_addon_price_cents integer,
  whitelabel_enabled boolean not null default false,
  whitelabel_sub_id text,
  whitelabel_sub_status text,
  constraint tenants_pkey primary key (id),
  constraint tenants_slug_key unique (slug),
  constraint tenants_kind_check check (kind = any (array['platform','reseller','coach'])),
  constraint tenants_commission_bps_check check (commission_bps is null or (commission_bps >= 0 and commission_bps <= 3000))
);

create table if not exists public.profiles (
  id uuid not null,
  email text,
  name text,
  sex text,
  age integer,
  height_cm numeric,
  rest_hr integer,
  paid boolean not null default false,
  photo_consent_at timestamptz,
  medical_hold boolean not null default false,
  start_date date,
  created_at timestamptz not null default now(),
  medical_ack_at timestamptz,
  medical_ack_name text,
  medical_ack_reasons text[],
  tenant_id uuid,
  role text not null default 'client'::text,
  selected_offer_id uuid,
  selected_interval text,
  subscription_id text,
  stripe_customer_id text,
  subscription_status text,
  subscription_interval text,
  subscription_current_period_end timestamptz,
  subscription_synced_at timestamptz,
  subscription_cancel_at_period_end boolean not null default false,
  referral_code text,
  referred_by uuid,
  constraint profiles_pkey primary key (id),
  constraint profiles_selected_interval_check check (selected_interval = any (array['month','year']))
);

create table if not exists public.plans (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  price_month_cents integer,
  price_year_cents integer,
  client_limit integer,
  setup_fee_cents integer not null default 0,
  is_active boolean not null default true,
  "position" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint plans_pkey primary key (id)
);

create table if not exists public.offers (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  duration_months integer not null,
  "position" integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  price_cents integer,
  currency text not null default 'eur'::text,
  vip_chat boolean not null default false,
  billing_type text not null default 'one_time'::text,
  price_month_cents integer,
  price_year_cents integer,
  coach_ai boolean not null default true,
  constraint offers_pkey primary key (id),
  constraint offers_billing_type_check check (billing_type = any (array['one_time','subscription'])),
  constraint offers_duration_months_check check (duration_months = any (array[1,2,3,6,9,12])),
  constraint offers_price_cents_check check (price_cents is null or price_cents >= 0)
);

create table if not exists public.tenant_secrets (
  tenant_id uuid not null,
  anthropic_key_enc text,
  anthropic_key_hint text,
  updated_at timestamptz not null default now(),
  stripe_key_enc text,
  stripe_key_hint text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_pass_enc text,
  smtp_from text,
  constraint tenant_secrets_pkey primary key (tenant_id)
);

create table if not exists public.coach_config (
  tenant_id uuid not null,
  generation_mode text not null default 'auto'::text,
  custom_methodology text not null default ''::text,
  updated_at timestamptz not null default now(),
  shop_enabled boolean not null default false,
  coach_name text,
  affiliation_enabled boolean not null default false,
  affiliation_reward text,
  coach_ai_daily_limit integer not null default 60,
  lead_magnet_enabled boolean not null default false,
  recipe_ai_daily_limit integer not null default 1,
  constraint coach_config_pkey primary key (tenant_id),
  constraint coach_config_mode check (generation_mode = any (array['auto','custom']))
);

create table if not exists public.prospects (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  email text not null,
  goal text,
  level text,
  days integer,
  equipment text,
  status text not null default 'nouveau'::text,
  created_at timestamptz not null default now(),
  constraint prospects_pkey primary key (id)
);

-- Portefeuille de crédits IA (Modèle B « revendeur en crédits »).
create table if not exists public.credit_wallets (
  tenant_id uuid not null,
  ai_credits integer not null default 0,
  program_credits integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint credit_wallets_pkey primary key (tenant_id)
);

create table if not exists public.credit_ledger (
  id bigint generated always as identity,
  tenant_id uuid not null,
  kind text not null,
  delta integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now(),
  constraint credit_ledger_pkey primary key (id)
);

create table if not exists public.credit_packs (
  id bigint generated always as identity,
  tenant_id uuid not null,
  name text not null,
  ai_credits integer not null default 0,
  program_credits integer not null default 0,
  price_cents integer not null,
  currency text not null default 'eur'::text,
  is_active boolean not null default true,
  "position" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint credit_packs_pkey primary key (id),
  -- Pack hybride : les deux types cohabitent, mais un pack vide n'a pas de sens.
  constraint credit_packs_credits_positive
    check (ai_credits >= 0 and program_credits >= 0 and (ai_credits + program_credits) > 0)
);

create table if not exists public.questionnaires (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  answers jsonb not null,
  train_days text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint questionnaires_pkey primary key (id)
);

create table if not exists public.equipment (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  confidence text,
  enabled boolean not null default true,
  source text not null default 'photo'::text,
  constraint equipment_pkey primary key (id)
);

create table if not exists public.programs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  plan jsonb not null,
  version integer not null default 1,
  model text,
  created_at timestamptz not null default now(),
  duration_months integer,
  constraint programs_pkey primary key (id),
  constraint programs_duration_months_check check (duration_months is null or duration_months = any (array[1,2,3,6,9,12]))
);

create table if not exists public.session_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  day integer not null,
  volume numeric,
  sets_done integer,
  entries jsonb,
  validated_at timestamptz not null default now(),
  constraint session_logs_pkey primary key (id),
  constraint session_logs_user_id_day_key unique (user_id, day),
  constraint session_logs_day_check check (day >= 1 and day <= 90)
);

create table if not exists public.weights (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  kg numeric not null,
  measured_at date not null default current_date,
  constraint weights_pkey primary key (id)
);

create table if not exists public.measurements (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  waist numeric,
  hips numeric,
  chest numeric,
  thigh numeric,
  arm numeric,
  measured_at date not null default current_date,
  constraint measurements_pkey primary key (id)
);

create table if not exists public.photos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  storage_path text not null,
  kind text not null default 'progress'::text,
  taken_at date not null default current_date,
  constraint photos_pkey primary key (id)
);

create table if not exists public.coach_conversations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Nouvelle conversation'::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_conversations_pkey primary key (id)
);

create table if not exists public.coach_messages (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  conversation_id uuid,
  constraint coach_messages_pkey primary key (id),
  constraint coach_messages_role_check check (role = any (array['user','assistant']))
);

create table if not exists public.coach_notes (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  coach_id uuid,
  tenant_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  constraint coach_notes_pkey primary key (id)
);

create table if not exists public.coach_notifications (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  type text not null,
  title text not null,
  body text,
  url text,
  client_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint coach_notifications_pkey primary key (id)
);

create table if not exists public.vip_messages (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid,
  client_id uuid not null,
  sender text not null,
  body text,
  image_url text,
  created_at timestamptz not null default now(),
  read_by_coach boolean not null default false,
  read_by_client boolean not null default false,
  constraint vip_messages_pkey primary key (id),
  constraint vip_messages_sender_check check (sender = any (array['client','coach'])),
  constraint vip_messages_content_present check ((body is not null and length(btrim(body)) > 0) or image_url is not null)
);

create table if not exists public.shopping_checks (
  user_id uuid not null,
  item_key text not null,
  constraint shopping_checks_pkey primary key (user_id, item_key)
);

create table if not exists public.push_subscriptions (
  endpoint text not null,
  user_id uuid not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_pkey primary key (endpoint)
);

create table if not exists public.scheduled_pushes (
  id uuid not null default gen_random_uuid(),
  title text not null,
  body text not null,
  url text not null default '/app'::text,
  send_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  filter_sex text,
  filter_goal text,
  filter_phase text,
  tenant_id uuid,
  constraint scheduled_pushes_pkey primary key (id)
);

create table if not exists public.ai_calls (
  id bigint generated always as identity,
  user_id uuid not null,
  route text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  constraint ai_calls_pkey primary key (id)
);

create table if not exists public.gift_codes (
  code text not null,
  note text,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  tenant_id uuid,
  offer_id uuid,
  kind text not null default 'coach_free'::text,
  buyer_email text,
  stripe_session_id text,
  constraint gift_codes_pkey primary key (code),
  constraint gift_codes_kind_check check (kind = any (array['coach_free','gift_purchase']))
);

create table if not exists public.promo_codes (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null,
  discount_type text not null,
  discount_value integer not null,
  active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint promo_codes_pkey primary key (id),
  constraint promo_codes_tenant_id_code_key unique (tenant_id, code),
  constraint promo_codes_discount_type_check check (discount_type = any (array['percent','fixed'])),
  constraint promo_codes_discount_value_check check (discount_value > 0)
);

create table if not exists public.exercise_guides (
  exercise_key text not null,
  name text not null,
  muscle text,
  steps jsonb not null default '[]'::jsonb,
  cues jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  source text not null default 'ai'::text,
  created_at timestamptz not null default now(),
  constraint exercise_guides_pkey primary key (exercise_key)
);

create table if not exists public.exercise_media (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  exercise_key text not null,
  name text not null,
  muscle text,
  image_url text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_media_pkey primary key (id),
  constraint exercise_media_tenant_id_exercise_key_key unique (tenant_id, exercise_key)
);

create table if not exists public.shop_products (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text not null default ''::text,
  image_url text not null default ''::text,
  link_url text not null default ''::text,
  "position" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint shop_products_pkey primary key (id)
);

-- =====================================================================
-- 2. CLÉS ÉTRANGÈRES (après création de toutes les tables)
-- =====================================================================

alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  add constraint profiles_tenant_id_fkey foreign key (tenant_id) references public.tenants(id),
  add constraint profiles_selected_offer_id_fkey foreign key (selected_offer_id) references public.offers(id),
  add constraint profiles_referred_by_fkey foreign key (referred_by) references public.profiles(id) on delete set null;

alter table public.tenants
  add constraint tenants_parent_id_fkey foreign key (parent_id) references public.tenants(id) on delete set null,
  add constraint tenants_plan_id_fkey foreign key (plan_id) references public.plans(id) on delete set null;

alter table public.plans
  add constraint plans_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.offers
  add constraint offers_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.tenant_secrets
  add constraint tenant_secrets_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.coach_config
  add constraint coach_config_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.prospects
  add constraint prospects_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.credit_wallets
  add constraint credit_wallets_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.credit_ledger
  add constraint credit_ledger_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.credit_packs
  add constraint credit_packs_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.questionnaires
  add constraint questionnaires_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.equipment
  add constraint equipment_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.programs
  add constraint programs_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.session_logs
  add constraint session_logs_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.weights
  add constraint weights_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.measurements
  add constraint measurements_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.photos
  add constraint photos_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.coach_conversations
  add constraint coach_conversations_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.coach_messages
  add constraint coach_messages_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint coach_messages_conversation_id_fkey foreign key (conversation_id) references public.coach_conversations(id) on delete cascade;
alter table public.coach_notes
  add constraint coach_notes_client_id_fkey foreign key (client_id) references auth.users(id) on delete cascade;
alter table public.coach_notifications
  add constraint coach_notifications_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade,
  add constraint coach_notifications_client_id_fkey foreign key (client_id) references public.profiles(id) on delete set null;
alter table public.vip_messages
  add constraint vip_messages_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade,
  add constraint vip_messages_client_id_fkey foreign key (client_id) references public.profiles(id) on delete cascade;
alter table public.shopping_checks
  add constraint shopping_checks_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.push_subscriptions
  add constraint push_subscriptions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.scheduled_pushes
  add constraint scheduled_pushes_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.ai_calls
  add constraint ai_calls_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.gift_codes
  add constraint gift_codes_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade,
  add constraint gift_codes_offer_id_fkey foreign key (offer_id) references public.offers(id) on delete set null,
  add constraint gift_codes_used_by_fkey foreign key (used_by) references auth.users(id) on delete set null;
alter table public.promo_codes
  add constraint promo_codes_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.exercise_media
  add constraint exercise_media_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

-- =====================================================================
-- 3. INDEX
-- =====================================================================

create index if not exists ai_calls_user_id_route_created_at_idx on public.ai_calls (user_id, route, created_at desc);
create index if not exists coach_conversations_user_idx on public.coach_conversations (user_id, updated_at desc);
create index if not exists coach_messages_conversation_idx on public.coach_messages (conversation_id, created_at);
create index if not exists coach_notes_client_idx on public.coach_notes (client_id, created_at desc);
create index if not exists coach_notifications_tenant_idx on public.coach_notifications (tenant_id, created_at desc);
create index if not exists coach_notifications_unread_idx on public.coach_notifications (tenant_id) where (read_at is null);
-- Unicité par (ref, kind) : un paiement de pack hybride pose DEUX lignes d'achat
-- (une par type de crédit), chacune idempotente sur sa propre clé.
create unique index if not exists credit_ledger_purchase_ref_uidx on public.credit_ledger (ref, kind) where (reason = 'purchase'::text and ref is not null);
create index if not exists credit_ledger_tenant_idx on public.credit_ledger (tenant_id, created_at desc);
create index if not exists credit_packs_tenant_idx on public.credit_packs (tenant_id, "position");
create index if not exists exercise_media_tenant_idx on public.exercise_media (tenant_id);
create unique index if not exists gift_codes_session_uidx on public.gift_codes (stripe_session_id) where (stripe_session_id is not null);
create index if not exists gift_codes_tenant_idx on public.gift_codes (tenant_id);
create index if not exists offers_tenant_idx on public.offers (tenant_id, "position");
create index if not exists plans_tenant_id_position_idx on public.plans (tenant_id, "position");
create unique index if not exists profiles_referral_code_key on public.profiles (referral_code) where (referral_code is not null);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
create index if not exists profiles_subscription_idx on public.profiles (subscription_id) where (subscription_id is not null);
create index if not exists promo_codes_tenant_idx on public.promo_codes (tenant_id);
create index if not exists prospects_tenant_idx on public.prospects (tenant_id, created_at desc);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists scheduled_pushes_due_idx on public.scheduled_pushes (send_at) where (sent_at is null);
create index if not exists scheduled_pushes_tenant_idx on public.scheduled_pushes (tenant_id);
create unique index if not exists tenants_custom_domain_key on public.tenants (lower(custom_domain)) where (custom_domain is not null);
create index if not exists tenants_parent_idx on public.tenants (parent_id);
create unique index if not exists tenants_subdomain_key on public.tenants (lower(subdomain)) where (subdomain is not null);
create index if not exists vip_messages_client_created_idx on public.vip_messages (client_id, created_at);
create index if not exists vip_messages_tenant_created_idx on public.vip_messages (tenant_id, created_at);

-- =====================================================================
-- 4. FONCTIONS & TRIGGERS
-- =====================================================================

-- Crée automatiquement une ligne profiles à l'inscription d'un utilisateur auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Débit atomique d'un portefeuille de crédits (Modèle B). Renvoie le solde
-- restant, ou NULL si insuffisant : la condition « >= p_amount » est dans
-- l'UPDATE, donc deux débits simultanés ne peuvent pas passer sous zéro.
create or replace function public.debit_credit(p_tenant uuid, p_kind text, p_amount integer)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare rem integer;
begin
  if p_kind = 'program' then
    update credit_wallets
      set program_credits = program_credits - p_amount, updated_at = now()
      where tenant_id = p_tenant and program_credits >= p_amount
      returning program_credits into rem;
  else
    update credit_wallets
      set ai_credits = ai_credits - p_amount, updated_at = now()
      where tenant_id = p_tenant and ai_credits >= p_amount
      returning ai_credits into rem;
  end if;
  return rem;
end;
$$;

-- Journal des accès d'assistance (« master admin ») : trace chaque connexion
-- d'un opérateur (plateforme / revendeur) dans un sous-compte de sa descendance.
-- Table server-only (RLS + droits révoqués, cf. section 5).
create table if not exists public.support_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_tenant_id uuid references public.tenants(id) on delete set null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists support_access_log_actor_idx on public.support_access_log (actor_user_id, created_at desc);
create index if not exists support_access_log_target_idx on public.support_access_log (target_user_id, created_at desc);

-- =====================================================================
-- 5. RLS — activation partout, puis droits ajustés par table
-- =====================================================================

-- RLS activé sur TOUTES les tables du schéma public.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- Tables SERVER-ONLY : aucune policy, droits révoqués à anon/authenticated.
-- Tout accès passe par le service_role (code serveur). (profiles / tenants /
-- offers NE sont PAS ici : le client y a un accès en lecture, voir section 6.)
do $$
declare t text;
begin
  foreach t in array array[
    'plans','tenant_secrets','coach_config','prospects',
    'credit_wallets','credit_ledger','credit_packs',
    'coach_notes','coach_notifications','vip_messages','scheduled_pushes',
    'ai_calls','gift_codes','promo_codes','exercise_guides','exercise_media','shop_products',
    'support_access_log'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end $$;

-- Tables « données du client » : le rôle authenticated a besoin des privilèges
-- de table pour que les policies (section 6) s'appliquent réellement.
grant select, insert, update, delete on
  public.questionnaires, public.equipment, public.session_logs, public.weights,
  public.measurements, public.photos, public.shopping_checks, public.push_subscriptions,
  public.programs, public.coach_conversations, public.coach_messages
  to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.tenants, public.offers to authenticated;

-- =====================================================================
-- 6. POLICIES — accès client à ses propres données (auth.uid())
-- =====================================================================

-- Données personnelles : le client (authenticated) accède à ses lignes.
create policy questionnaires_own on public.questionnaires for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy equipment_own on public.equipment for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy session_logs_own on public.session_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy weights_own on public.weights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy measurements_own on public.measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy photos_own on public.photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shopping_checks_own on public.shopping_checks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy push_subscriptions_own on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy programs_own on public.programs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy coach_conversations_own on public.coach_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy coach_messages_own on public.coach_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Le client lit et met à jour SON profil.
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Le client lit son tenant (son coach) et les offres de ce tenant (landing).
create policy tenants_select_own on public.tenants for select
  using (id in (select p.tenant_id from public.profiles p where p.id = auth.uid()));
create policy offers_select_own on public.offers for select
  using (tenant_id in (select p.tenant_id from public.profiles p where p.id = auth.uid()));
