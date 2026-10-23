-- One-time setup in the Supabase SQL Editor after you deploy send-reminders.
-- Replace all placeholders. Store secrets in Vault; do not commit real values in this file.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'ascend_project_url');
select vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY', 'ascend_publishable_key');
select vault.create_secret('PASTE_THE_SAME_RANDOM_CRON_SECRET_SET_IN_EDGE_FUNCTIONS', 'ascend_cron_secret');

select cron.unschedule(jobid) from cron.job where jobname = 'ascend-os-reminders-every-minute';
select cron.schedule(
  'ascend-os-reminders-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'ascend_project_url') || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'ascend_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'ascend_cron_secret')
      ),
      body := jsonb_build_object('source', 'supabase-cron')
    ) as request_id;
  $$
);