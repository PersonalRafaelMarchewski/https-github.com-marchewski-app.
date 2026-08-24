-- Robôs de lembrete (pg_cron): atualiza a URL pro domínio novo e aumenta
-- o timeout da chamada HTTP.
--
-- Contexto do bug (ago/2026): lembretes de aula das MANHÃS eram enviados,
-- os do FIM DE TARDE/NOITE (aulas de 15h em diante, BR) nunca — padrão
-- diário consistente, com todas as aulas criadas com dias de antecedência.
-- A rota da API funciona o dia inteiro (testada manualmente com 200), o
-- que aponta pro lado do agendador: ou o job não dispara nessas horas, ou
-- o net.http_post falha (o timeout padrão do pg_net é 2s — um cold start
-- da Vercel passa disso fácil; timeout_milliseconds := 15000 dá folga).
--
-- Os dois jobs também chamavam a URL antiga (marchewski-app.vercel.app),
-- que ainda funciona por ser o apelido do projeto na Vercel, mas fica
-- aqui atualizada pro domínio definitivo.
--
-- Rode no SQL Editor do Supabase. Os diagnósticos ficam por conta das
-- queries que o Claude passou junto (cron.job_run_details e
-- net._http_response) — rode elas ANTES desta migração se quiser
-- preservar a evidência do padrão.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------- lembretes de aula (a cada minuto) ----------------
select cron.unschedule('send-session-reminders')
where exists (select 1 from cron.job where jobname = 'send-session-reminders');

select cron.schedule(
  'send-session-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://app.marchewskiassessoria.com/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer a8ec5777e644241bc9cfb3c501d4f09349954cb2b17b3a68'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);

-- ---------------- aniversários (todo dia 9h BR = 12h UTC) ----------------
select cron.unschedule('send-birthday-reminders')
where exists (select 1 from cron.job where jobname = 'send-birthday-reminders');

select cron.schedule(
  'send-birthday-reminders',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://app.marchewskiassessoria.com/api/cron/birthdays',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer a8ec5777e644241bc9cfb3c501d4f09349954cb2b17b3a68'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);
