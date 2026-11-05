SELECT cron.unschedule('reindex-evidence-weekly');

SELECT cron.schedule(
  'reindex-evidence-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--8caa90e6-d0df-4364-8848-230b0fb99733.lovable.app/api/public/hooks/reindex-evidence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_NPGiwX8S1tuOyD99ZqkUQA_im_J9-W3'
    ),
    body := '{}'::jsonb
  );
  $$
);