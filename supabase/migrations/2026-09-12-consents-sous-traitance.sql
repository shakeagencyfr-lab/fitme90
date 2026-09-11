-- Ajoute le type d'accord « sous-traitance » aux consentements.
--
-- POURQUOI UNE MIGRATION À PART. La table `consents` a pu être créée avant
-- que l'accord de l'article 28 n'existe : sa contrainte n'accepte alors que
-- quatre valeurs, et l'inscription d'un coach échouerait silencieusement à
-- écrire sa preuve d'acceptation. Ce fichier est sans effet si la table est
-- déjà à jour, et rattrape le cas contraire.
--
-- À PASSER DANS L'ÉDITEUR SQL SUPABASE, après 2026-09-11-consents.sql.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'consents_kind_check') then
    alter table public.consents drop constraint consents_kind_check;
  end if;
  alter table public.consents
    add constraint consents_kind_check
    check (kind in ('cgv', 'confidentialite', 'sante', 'prospection', 'sous-traitance'));
end $$;
