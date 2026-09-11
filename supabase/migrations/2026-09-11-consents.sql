-- Migration : table des consentements (RGPD, article 7.1).
--
-- À PASSER SUR LA BASE AVANT DE DÉPLOYER, ou juste après : sans elle, les
-- consentements ne sont pas écrits (l'application ne plante pas pour autant,
-- l'erreur part dans les logs serveur et l'inscription se poursuit).
--
-- Console Supabase > SQL Editor > coller ce fichier > Run.
-- Le contenu est identique au bloc 12 de supabase/schema.sql.

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  text_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  constraint consents_kind_check check (kind in ('cgv', 'confidentialite', 'sante', 'prospection'))
);

create index if not exists consents_user_idx on public.consents (user_id, kind, granted_at desc);

alter table public.consents enable row level security;

drop policy if exists "consents: lecture par le titulaire" on public.consents;
create policy "consents: lecture par le titulaire" on public.consents
  for select using (auth.uid() = user_id);

-- L'écriture reste au service_role : un consentement que le navigateur
-- pourrait forger ne prouverait rien.
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
