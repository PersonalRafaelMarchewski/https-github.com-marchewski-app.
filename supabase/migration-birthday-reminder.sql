-- Lembrete de aniversário do aluno. Rode no SQL Editor do Supabase.
-- (pg_cron e pg_net já devem estar habilitados pela migração da agenda;
-- se der erro nas duas linhas abaixo, é só rodar de novo depois.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-birthday-reminders')
where exists (select 1 from cron.job where jobname = 'send-birthday-reminders');

-- roda todo dia às 9h no horário do Brasil (12:00 UTC)
select cron.schedule(
  'send-birthday-reminders',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://marchewski-app.vercel.app/api/cron/birthdays',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer a8ec5777e644241bc9cfb3c501d4f09349954cb2b17b3a68'
    ),
    body := '{}'::jsonb
  );
  $$
);
