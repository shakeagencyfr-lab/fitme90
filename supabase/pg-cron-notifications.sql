-- =====================================================================
-- Notifications à l'heure près, sans changer de plan Vercel
-- =====================================================================
--
-- LE PROBLÈME. Le plan Hobby de Vercel n'accepte que des crons QUOTIDIENS.
-- Une notification programmée ne pouvait donc partir qu'à l'un des quatre
-- passages de cron de la journée, et le formulaire n'offrait que ces quatre
-- créneaux pour ne pas mentir sur l'heure d'envoi.
--
-- LA SOLUTION. Postgres sait déclencher des tâches (pg_cron) et appeler une
-- URL (pg_net). On sort donc l'ordonnanceur de Vercel : Supabase appelle notre
-- route /api/cron/dispatch toutes les cinq minutes, et cette route vide la
-- file des notifications dues. L'heure devient libre, à cinq minutes près.
--
-- Cette route est idempotente : le dispatcher n'envoie que ce qui est dû et
-- marque chaque ligne au passage. L'appeler dix fois de suite n'envoie rien
-- de plus. Les crons Vercel continuent de la vider aussi, sans conflit.
--
-- ---------------------------------------------------------------------
-- À FAIRE AVANT D'EXÉCUTER CE FICHIER
-- ---------------------------------------------------------------------
--   1. Supabase > Database > Extensions : activer `pg_cron` et `pg_net`.
--   2. Remplacer les deux valeurs ci-dessous par les vôtres.
--   3. Exécuter ce fichier dans le SQL Editor.
--   4. Poser NEXT_PUBLIC_PUSH_PRECISE=1 dans les variables Vercel, puis
--      redéployer. C'est ce drapeau qui ouvre le choix de l'heure dans le
--      formulaire. Tant qu'il est absent, l'interface s'en tient aux quatre
--      créneaux : elle ne promet jamais ce que l'infrastructure ne tient pas.
--
-- Le secret voyage dans un en-tête, jamais dans l'URL : les URL se retrouvent
-- dans les journaux, pas les en-têtes.

-- Le secret des crons, le même que la variable CRON_SECRET de Vercel.
-- Stocké dans le Vault plutôt qu'en clair dans la définition de la tâche,
-- qui est lisible par quiconque peut interroger `cron.job`.
select vault.create_secret('REMPLACER_PAR_LE_CRON_SECRET', 'cron_secret', 'Secret partagé avec les routes /api/cron');

select cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://myfitnessapp.fit/api/cron/dispatch',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- ---------------------------------------------------------------------
-- VÉRIFIER
-- ---------------------------------------------------------------------
--   select * from cron.job;                                  -- la tâche existe
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;  -- code 200 attendu
--
-- ANNULER
--   select cron.unschedule('dispatch-notifications');
--   (et retirer NEXT_PUBLIC_PUSH_PRECISE des variables Vercel, sinon le
--    formulaire continuerait de proposer des heures que plus rien ne sert)
